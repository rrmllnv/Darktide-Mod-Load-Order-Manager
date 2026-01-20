const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { existsSync, readdirSync, statSync, lstatSync, symlink } = require('fs');
const { promisify } = require('util');
const { spawn } = require('child_process');
const symlinkAsync = promisify(symlink);

async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

const DEFAULT_PATH = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Warhammer 40,000 DARKTIDE\\mods\\mod_load_order.txt';

function findModLoadOrderFile() {
  const standardPaths = [];
  
  const drives = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const gamePath = '\\steamapps\\common\\Warhammer 40,000 DARKTIDE\\mods\\mod_load_order.txt';
  
  for (const drive of drives) {
    standardPaths.push(`${drive}:\\Program Files (x86)\\Steam${gamePath}`);
    standardPaths.push(`${drive}:\\Program Files\\Steam${gamePath}`);
    standardPaths.push(`${drive}:\\Steam${gamePath}`);
    standardPaths.push(`${drive}:\\SteamLibrary${gamePath}`);
  }
  
  for (const filePath of standardPaths) {
    if (existsSync(filePath)) {
      return filePath;
    }
  }
  
  return null;
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 900,
    minWidth: 870,
    minHeight: 680,
    icon: path.join(__dirname, 'app', 'icons', 'darktide-icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Darktide Mod Load Order Manager',
    autoHideMenuBar: true
  });

  mainWindow.loadFile('app/index.html');

  mainWindow.setMenuBarVisibility(false);

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-default-path', () => {
  return DEFAULT_PATH;
});

ipcMain.handle('find-mod-load-order-file', () => {
  return findModLoadOrderFile();
});

ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    return existsSync(filePath);
  } catch (error) {
    return false;
  }
});

ipcMain.handle('load-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-file', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-file', async (event, defaultPath) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите mod_load_order.txt',
    defaultPath: defaultPath,
    filters: [
      { name: 'Text files', extensions: ['txt'] },
      { name: 'All files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  return { success: true, filePath: result.filePaths[0] };
});

ipcMain.handle('select-folder', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите папку с модом',
    properties: ['openDirectory']
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  return { success: true, folderPath: result.filePaths[0] };
});

ipcMain.handle('scan-mods-directory', async (event, modsDir) => {
  try {
    if (!existsSync(modsDir)) {
      return { success: false, error: 'Папка не существует' };
    }

    const items = readdirSync(modsDir);
    const newMods = [];
    const symlinkMods = new Map();

    for (const item of items) {
      const itemPath = path.join(modsDir, item);
      
      const stats = lstatSync(itemPath);
      const isSymlink = stats.isSymbolicLink();
      
      if (!stats.isDirectory() && !isSymlink) {
        continue;
      }
      
      if (isSymlink) {
        try {
          const targetStats = statSync(itemPath);
          if (!targetStats.isDirectory()) {
            continue;
          }
        } catch (e) {
          continue;
        }
      }

      if (item.startsWith('_') || ['base', 'dmf'].includes(item.toLowerCase())) {
        continue;
      }

      const modFile = path.join(itemPath, `${item}.mod`);
      if (existsSync(modFile)) {
        newMods.push(item);
        symlinkMods.set(item, isSymlink);
      }
    }

    return { success: true, mods: newMods.sort(), symlinks: symlinkMods };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-profiles-directory', async (event, modsDir) => {
  try {
    const userDataDir = app.getPath('userData');
    const profilesDir = path.join(userDataDir, 'profiles');
    await fs.mkdir(profilesDir, { recursive: true });
    return { success: true, path: profilesDir };
  } catch (error) {
  }

  try {
    if (modsDir) {
      const profilesDir = path.join(modsDir, 'ModLoadOrderManager_profiles');
      await fs.mkdir(profilesDir, { recursive: true });
      return { success: true, path: profilesDir };
    }
  } catch (error) {
  }

  try {
    const profilesDir = path.join(__dirname, 'profiles');
    await fs.mkdir(profilesDir, { recursive: true });
    return { success: true, path: profilesDir };
  } catch (error2) {
    return { success: false, error: error2.message };
  }
});

ipcMain.handle('list-profiles', async (event, profilesDir) => {
  try {
    if (!existsSync(profilesDir)) {
      return { success: true, profiles: [] };
    }

    const files = readdirSync(profilesDir);
    const profiles = files
      .filter(file => file.endsWith('.json'))
      .map(file => file.slice(0, -5));

    return { success: true, profiles };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-profile', async (event, profilesDir, profileName, state) => {
  try {
    if (!existsSync(profilesDir)) {
      await fs.mkdir(profilesDir, { recursive: true });
    }

    const profilePath = path.join(profilesDir, `${profileName}.json`);
    await fs.writeFile(profilePath, JSON.stringify(state, null, 2), 'utf-8');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-profile', async (event, profilesDir, profileName) => {
  try {
    const profilePath = path.join(profilesDir, `${profileName}.json`);
    const content = await fs.readFile(profilePath, 'utf-8');
    const state = JSON.parse(content);
    
    return { success: true, state };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-profile', async (event, profilesDir, profileName) => {
  try {
    const profilePath = path.join(profilesDir, `${profileName}.json`);
    if (existsSync(profilePath)) {
      await fs.unlink(profilePath);
      return { success: true };
    }
    return { success: false, error: 'Файл не найден' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rename-profile', async (event, profilesDir, oldName, newName) => {
  try {
    const oldPath = path.join(profilesDir, `${oldName}.json`);
    const newPath = path.join(profilesDir, `${newName}.json`);
    
    if (!existsSync(oldPath)) {
      return { success: false, error: 'Файл не найден' };
    }
    
    const isCaseOnlyChange = oldName.toLowerCase() === newName.toLowerCase();
    
    if (!isCaseOnlyChange && existsSync(newPath)) {
      return { success: false, error: 'Профиль с таким именем уже существует' };
    }
    
    await fs.rename(oldPath, newPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-symlink', async (event, linkPath, targetPath) => {
  try {
    if (existsSync(linkPath)) {
      try {
        const stats = await fs.lstat(linkPath);
        if (stats.isSymbolicLink()) {
          return { success: false, error: 'Символическая ссылка уже существует' };
        } else {
          return { success: false, error: 'Папка или файл с таким именем уже существует' };
        }
      } catch (e) {
        return { success: false, error: 'Папка или файл с таким именем уже существует' };
      }
    }
    
    if (!existsSync(targetPath)) {
      return { success: false, error: 'Целевая папка не существует' };
    }
    
    const linkType = process.platform === 'win32' ? 'junction' : 'dir';
    
    try {
      await symlinkAsync(targetPath, linkPath, linkType);
      return { success: true };
    } catch (error) {
      if (process.platform === 'win32' && linkType === 'junction') {
        try {
          await symlinkAsync(targetPath, linkPath, 'dir');
          return { success: true };
        } catch (e) {
          return { 
            success: false, 
            error: `Не удалось создать символическую ссылку. Возможно, нужны права администратора или включен Developer Mode. Ошибка: ${e.message}` 
          };
        }
      }
      throw error;
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

function getUserConfigPath() {
  const userDataDir = app.getPath('userData');
  return path.join(userDataDir, 'UserConfig.json');
}

async function getDirectorySize(dirPath) {
  let totalSize = 0;
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        totalSize += await getDirectorySize(entryPath);
      } else {
        const stats = await fs.stat(entryPath);
        totalSize += stats.size;
      }
    }
  } catch (error) {
    console.error('Error calculating directory size:', error);
  }
  return totalSize;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getBackupsMetadataPath(modName) {
  const userDataDir = app.getPath('userData');
  return path.join(userDataDir, 'Backups', 'ProjectMods', modName, 'backups_metadata.json');
}

async function loadBackupsMetadata(modName) {
  try {
    const metadataPath = getBackupsMetadataPath(modName);
    if (!existsSync(metadataPath)) {
      return {};
    }
    const content = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading backups metadata:', error);
    return {};
  }
}

async function saveBackupsMetadata(modName, metadata) {
  try {
    const userDataDir = app.getPath('userData');
    const backupsDir = path.join(userDataDir, 'Backups', 'ProjectMods', modName);
    await fs.mkdir(backupsDir, { recursive: true });
    
    const metadataPath = getBackupsMetadataPath(modName);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving backups metadata:', error);
    return false;
  }
}

ipcMain.handle('get-backups-directory', async (event) => {
  try {
    const userDataDir = app.getPath('userData');
    const backupsDir = path.join(userDataDir, 'Backups', 'ProjectMods');
    await fs.mkdir(backupsDir, { recursive: true });
    return { success: true, path: backupsDir };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-mods-with-backups', async (event) => {
  try {
    const userDataDir = app.getPath('userData');
    const backupsDir = path.join(userDataDir, 'Backups', 'ProjectMods');

    if (!existsSync(backupsDir)) {
      return { success: true, mods: [] };
    }

    const entries = await fs.readdir(backupsDir, { withFileTypes: true });
    const mods = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const modName = entry.name;
        const modBackupsDir = path.join(backupsDir, modName);
        
        const backupEntries = await fs.readdir(modBackupsDir, { withFileTypes: true });
        const backupDirs = backupEntries.filter(e => e.isDirectory());
        
        if (backupDirs.length > 0) {
          const metadata = await loadBackupsMetadata(modName);
          const backupVersions = Object.keys(metadata);
          let lastBackupDate = null;
          
          if (backupVersions.length > 0) {
            const lastBackup = backupVersions.sort().reverse()[0];
            const lastBackupMeta = metadata[lastBackup];
            if (lastBackupMeta && lastBackupMeta.created) {
              lastBackupDate = new Date(lastBackupMeta.created);
            }
          }
          
          if (!lastBackupDate) {
            const backupStats = await Promise.all(
              backupDirs.map(async (dir) => {
                const backupPath = path.join(modBackupsDir, dir.name);
                const stats = await fs.stat(backupPath);
                return stats.birthtime || stats.mtime;
              })
            );
            lastBackupDate = new Date(Math.max(...backupStats.map(d => d.getTime())));
          }
          
          mods.push({
            modName: modName,
            backupsCount: backupDirs.length,
            lastBackupDate: lastBackupDate
          });
        }
      }
    }

    mods.sort((a, b) => {
      return b.lastBackupDate.getTime() - a.lastBackupDate.getTime();
    });

    return { success: true, mods };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-backup', async (event, projectPath, modName, comment = '') => {
  try {
    if (!projectPath || !modName) {
      return { success: false, error: 'Project path and mod name are required' };
    }

    const userDataDir = app.getPath('userData');
    const backupsDir = path.join(userDataDir, 'Backups', 'ProjectMods', modName);
    await fs.mkdir(backupsDir, { recursive: true });

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const versionName = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

    const modPath = path.join(projectPath, modName);
    const backupPath = path.join(backupsDir, versionName);

    if (!existsSync(modPath)) {
      return { success: false, error: 'Mod folder does not exist' };
    }

    const stats = statSync(modPath);
    if (!stats.isDirectory()) {
      return { success: false, error: 'Mod path is not a directory' };
    }

    await copyDirectory(modPath, backupPath);

    const metadata = await loadBackupsMetadata(modName);
    metadata[versionName] = {
      comment: comment || '',
      created: now.toISOString()
    };
    await saveBackupsMetadata(modName, metadata);

    return { success: true, versionName, backupPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-backups', async (event, modName) => {
  try {
    if (!modName) {
      return { success: false, error: 'Mod name is required' };
    }

    const userDataDir = app.getPath('userData');
    const modBackupsDir = path.join(userDataDir, 'Backups', 'ProjectMods', modName);

    if (!existsSync(modBackupsDir)) {
      return { success: true, backups: [] };
    }

    const entries = await fs.readdir(modBackupsDir, { withFileTypes: true });
    const backups = [];
    const metadata = await loadBackupsMetadata(modName);

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const backupPath = path.join(modBackupsDir, entry.name);
        const size = await getDirectorySize(backupPath);
        const stats = await fs.stat(backupPath);
        const backupMeta = metadata[entry.name] || {};
        
        backups.push({
          versionName: entry.name,
          path: backupPath,
          size: size,
          sizeFormatted: formatBytes(size),
          created: stats.birthtime || stats.mtime,
          comment: backupMeta.comment || ''
        });
      }
    }

    backups.sort((a, b) => {
      return b.created.getTime() - a.created.getTime();
    });

    return { success: true, backups };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('restore-backup', async (event, projectPath, modName, versionName) => {
  try {
    if (!projectPath || !modName || !versionName) {
      return { success: false, error: 'Project path, mod name and version name are required' };
    }

    const userDataDir = app.getPath('userData');
    const backupPath = path.join(userDataDir, 'Backups', 'ProjectMods', modName, versionName);
    const modPath = path.join(projectPath, modName);

    if (!existsSync(backupPath)) {
      return { success: false, error: 'Backup does not exist' };
    }

    const stats = statSync(backupPath);
    if (!stats.isDirectory()) {
      return { success: false, error: 'Backup path is not a directory' };
    }

    if (existsSync(modPath)) {
      await fs.rm(modPath, { recursive: true, force: true });
    }

    await copyDirectory(backupPath, modPath);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-backup', async (event, modName, versionName) => {
  try {
    if (!modName || !versionName) {
      return { success: false, error: 'Mod name and version name are required' };
    }

    const userDataDir = app.getPath('userData');
    const backupPath = path.join(userDataDir, 'Backups', 'ProjectMods', modName, versionName);

    if (!existsSync(backupPath)) {
      return { success: false, error: 'Backup does not exist' };
    }

    await fs.rm(backupPath, { recursive: true, force: true });

    const metadata = await loadBackupsMetadata(modName);
    if (metadata[versionName]) {
      delete metadata[versionName];
      await saveBackupsMetadata(modName, metadata);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-backup-comment', async (event, modName, versionName, comment) => {
  try {
    if (!modName || !versionName) {
      return { success: false, error: 'Mod name and version name are required' };
    }

    const metadata = await loadBackupsMetadata(modName);
    if (!metadata[versionName]) {
      metadata[versionName] = {};
    }
    
    metadata[versionName].comment = comment || '';
    if (!metadata[versionName].created) {
      metadata[versionName].created = new Date().toISOString();
    }
    
    await saveBackupsMetadata(modName, metadata);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-user-config', async () => {
  try {
    const userConfigPath = getUserConfigPath();
    
    function getDefaultUserConfig() {
      return {
        fileUrlModLoadOrder: '',
        theme: '',
        locale: 'en',
        hideNewMods: false,
        hideDeletedMods: false,
        hideUnusedMods: false
      };
    }
    
    if (!existsSync(userConfigPath)) {
      const defaultUserConfig = getDefaultUserConfig();
      
      await fs.writeFile(userConfigPath, JSON.stringify(defaultUserConfig, null, 2), 'utf-8');
      return { success: true, userConfig: defaultUserConfig };
    }
    
    const content = await fs.readFile(userConfigPath, 'utf-8');
    const userConfig = JSON.parse(content);
    
    const defaultUserConfig = getDefaultUserConfig();
    
    const mergedUserConfig = { ...defaultUserConfig, ...userConfig };
    
    return { success: true, userConfig: mergedUserConfig };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-user-config', async (event, userConfig) => {
  try {
    const userConfigPath = getUserConfigPath();
    const userDataDir = app.getPath('userData');
    
    if (!existsSync(userDataDir)) {
      await fs.mkdir(userDataDir, { recursive: true });
    }
    
    await fs.writeFile(userConfigPath, JSON.stringify(userConfig, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-is-directory', async (event, filePath) => {
  try {
    if (!existsSync(filePath)) {
      return false;
    }
    const stats = statSync(filePath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
});

ipcMain.handle('copy-folder-to-mods', async (event, sourcePath, modsDir) => {
  try {
    if (!existsSync(sourcePath)) {
      return { success: false, error: 'Исходная папка не существует' };
    }
    
    const stats = statSync(sourcePath);
    if (!stats.isDirectory()) {
      return { success: false, error: 'Указанный путь не является папкой' };
    }
    
    if (!existsSync(modsDir)) {
      return { success: false, error: 'Директория модов не существует' };
    }
    
    const folderName = path.basename(sourcePath);
    const destPath = path.join(modsDir, folderName);
    
    if (existsSync(destPath)) {
      return { success: false, error: `Папка "${folderName}" уже существует в директории модов` };
    }
    
    await copyDirectory(sourcePath, destPath);
    
    return { success: true, folderName: folderName };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('launch-dtkit-patch', async (event, gameDir) => {
  try {
    if (!existsSync(gameDir)) {
      return { success: false, error: `Директория игры не найдена: ${gameDir}` };
    }
    
    const dtkitPath = path.join(gameDir, 'tools', 'dtkit-patch');
    const dtkitPathExe = path.join(gameDir, 'tools', 'dtkit-patch.exe');
    
    let executablePath = null;
    if (existsSync(dtkitPathExe)) {
      executablePath = dtkitPathExe;
    } else if (existsSync(dtkitPath)) {
      executablePath = dtkitPath;
    } else {
      return { success: false, error: `dtkit-patch не найден в: ${path.join(gameDir, 'tools')}` };
    }
    
    const bundlePath = path.join(gameDir, 'bundle');
    
    const child = spawn(executablePath, ['--toggle', bundlePath], {
      cwd: gameDir,
      detached: true,
      stdio: 'ignore'
    });
    
    child.unref();
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-file', async (event, filePath) => {
  try {
    if (!filePath || !existsSync(filePath)) {
      return { success: false, error: 'Файл не найден' };
    }
    
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  try {
    if (!folderPath || !existsSync(folderPath)) {
      return { success: false, error: 'Папка не найдена' };
    }
    
    await shell.openPath(folderPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-mod-structure', async (event, projectPath, modName) => {
  try {
    if (!projectPath || !existsSync(projectPath)) {
      return { success: false, error: 'Путь к проекту не найден' };
    }
    
    if (!modName || !/^[A-Za-z][A-Za-z0-9_]*$/.test(modName)) {
      return { success: false, error: 'Недопустимое название мода. Разрешены только английские буквы, цифры и подчеркивание, начинаться должно с буквы.' };
    }
    
    const modDir = path.join(projectPath, modName);
    if (existsSync(modDir)) {
      return { success: false, error: 'Мод с таким названием уже существует' };
    }
    
    await fs.mkdir(modDir, { recursive: true });
    
    const scriptsDir = path.join(modDir, 'scripts', 'mods', modName);
    await fs.mkdir(scriptsDir, { recursive: true });
    
    const modFileContent = `return {
	run = function()
		fassert(rawget(_G, "new_mod"), "\`${modName}\` encountered an error loading the Darktide Mod Framework.")

		new_mod("${modName}", {
			mod_script       = "${modName}/scripts/mods/${modName}/${modName}",
			mod_data         = "${modName}/scripts/mods/${modName}/${modName}_data",
			mod_localization = "${modName}/scripts/mods/${modName}/${modName}_localization",
		})
	end,
	packages = {},
}
`;
    
    const modLuaContent = `local mod = get_mod("${modName}")

mod.version = "1.0.0"

-- Your mod code goes here.
`;
    
    const modDataContent = `local mod = get_mod("${modName}")

return {
	name = mod:localize("mod_name"),
	description = mod:localize("mod_description"),
	is_togglable = true,
}
`;
    
    const modLocalizationContent = `return {
	mod_name = {
		en = "${modName}",
	},
	mod_description = {
		en = "${modName} description",
	},
}
`;
    
    await fs.writeFile(path.join(modDir, `${modName}.mod`), modFileContent, 'utf8');
    await fs.writeFile(path.join(scriptsDir, `${modName}.lua`), modLuaContent, 'utf8');
    await fs.writeFile(path.join(scriptsDir, `${modName}_data.lua`), modDataContent, 'utf8');
    await fs.writeFile(path.join(scriptsDir, `${modName}_localization.lua`), modLocalizationContent, 'utf8');
    
    return { success: true, modPath: modDir };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

async function deleteDirectory(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

ipcMain.handle('delete-folder', async (event, folderPath) => {
  try {
    if (!existsSync(folderPath)) {
      return { success: false, error: 'Папка не существует' };
    }
    
    const stats = statSync(folderPath);
    if (!stats.isDirectory()) {
      return { success: false, error: 'Указанный путь не является папкой' };
    }
    
    await deleteDirectory(folderPath);
    
    // Если deleteDirectory не выбросила исключение, считаем удаление успешным
    // Проверка existsSync может быть ненадежной из-за кэширования файловой системы
    return { success: true };
  } catch (error) {
    console.error('Error in delete-folder:', error);
    
    let errorMessage = error.message;
    
    // Если ошибка ENOENT, возможно папка уже была удалена - проверяем
    if (error.code === 'ENOENT') {
      if (!existsSync(folderPath)) {
        return { success: true };
      }
    }
    
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      errorMessage = 'Нет прав доступа для удаления папки. Возможно, файлы открыты в другом приложении или требуются права администратора.';
    } else if (error.code === 'EBUSY' || error.code === 'ENOTEMPTY') {
      errorMessage = 'Папка или файлы внутри неё используются другим процессом. Закройте все программы, использующие эти файлы.';
    }
    
    return { success: false, error: errorMessage };
  }
});

ipcMain.handle('get-todos-directory', async (event) => {
  try {
    const userDataDir = app.getPath('userData');
    const todosDir = path.join(userDataDir, 'Todos');
    await fs.mkdir(todosDir, { recursive: true });
    return { success: true, path: todosDir };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-todos', async (event, todosDir, modName, options = {}) => {
  try {
    if (!modName) {
      return { success: false, error: 'Mod name is required' };
    }
    
    const todosPath = path.join(todosDir, `${modName}.json`);
    
    if (!existsSync(todosPath)) {
      return { success: true, todos: [], total: 0 };
    }
    
    const content = await fs.readFile(todosPath, 'utf-8');
    const data = JSON.parse(content);
    
    let todos = Array.isArray(data) ? data : (data.todos || []);
    const total = todos.length;
    
    const { offset = 0, limit } = options;
    
    if (limit !== undefined) {
      todos = todos.slice(offset, offset + limit);
    }
    
    return { success: true, todos, total };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-all-todos', async (event, todosDir) => {
  try {
    if (!existsSync(todosDir)) {
      return { success: true, allTodos: [] };
    }
    
    const files = readdirSync(todosDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const allTodos = [];
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(todosDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        const todos = Array.isArray(data) ? data : (data.todos || []);
        
        todos.forEach(todo => {
          if (!todo.modName) {
            const modName = file.slice(0, -5);
            todo.modName = modName;
          }
          allTodos.push(todo);
        });
      } catch (error) {
        console.error(`Error reading todos file ${file}:`, error);
      }
    }
    
    return { success: true, allTodos };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-todo', async (event, todosDir, modName, todo) => {
  try {
    if (!modName) {
      return { success: false, error: 'Mod name is required' };
    }
    
    if (!todo || !todo.id || !todo.text) {
      return { success: false, error: 'Invalid todo data' };
    }
    
    const todosPath = path.join(todosDir, `${modName}.json`);
    
    let todos = [];
    if (existsSync(todosPath)) {
      try {
        const content = await fs.readFile(todosPath, 'utf-8');
        const data = JSON.parse(content);
        todos = Array.isArray(data) ? data : (data.todos || []);
      } catch (error) {
        console.error('Error reading existing todos:', error);
      }
    }
    
    todo.modName = modName;
    todos.unshift(todo);
    
    await fs.writeFile(todosPath, JSON.stringify(todos, null, 2), 'utf-8');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-todo', async (event, todosDir, modName, todoId, updatedTodo) => {
  try {
    if (!modName) {
      return { success: false, error: 'Mod name is required' };
    }
    
    if (!todoId) {
      return { success: false, error: 'Todo ID is required' };
    }
    
    const todosPath = path.join(todosDir, `${modName}.json`);
    
    if (!existsSync(todosPath)) {
      return { success: false, error: 'Todos file not found' };
    }
    
    const content = await fs.readFile(todosPath, 'utf-8');
    const data = JSON.parse(content);
    let todos = Array.isArray(data) ? data : (data.todos || []);
    
    const index = todos.findIndex(t => t.id === todoId);
    if (index === -1) {
      return { success: false, error: 'Todo not found' };
    }
    
    todos[index] = { ...todos[index], ...updatedTodo };
    
    await fs.writeFile(todosPath, JSON.stringify(todos, null, 2), 'utf-8');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-todos-file', async (event, todosDir, modName, todos) => {
  try {
    if (!modName) {
      return { success: false, error: 'Mod name is required' };
    }
    
    const todosPath = path.join(todosDir, `${modName}.json`);
    
    await fs.writeFile(todosPath, JSON.stringify(todos, null, 2), 'utf-8');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-todo', async (event, todosDir, modName, todoId) => {
  try {
    if (!modName) {
      return { success: false, error: 'Mod name is required' };
    }
    
    if (!todoId) {
      return { success: false, error: 'Todo ID is required' };
    }
    
    const todosPath = path.join(todosDir, `${modName}.json`);
    
    if (!existsSync(todosPath)) {
      return { success: false, error: 'Todos file not found' };
    }
    
    const content = await fs.readFile(todosPath, 'utf-8');
    const data = JSON.parse(content);
    let todos = Array.isArray(data) ? data : (data.todos || []);
    
    todos = todos.filter(t => t.id !== todoId);
    
    await fs.writeFile(todosPath, JSON.stringify(todos, null, 2), 'utf-8');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-console-logs-path', async (event) => {
  try {
    if (process.platform === 'win32') {
      const appDataPath = app.getPath('appData');
      const consoleLogsPath = path.join(appDataPath, 'Fatshark', 'Darktide', 'console_logs');
      return { success: true, path: consoleLogsPath };
    } else {
      return { success: false, error: 'This feature is only available on Windows' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});
