const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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
  const standardPaths = [
    'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Warhammer 40,000 DARKTIDE\\mods\\mod_load_order.txt',
    'C:\\Program Files\\Steam\\steamapps\\common\\Warhammer 40,000 DARKTIDE\\mods\\mod_load_order.txt',
    'D:\\Steam\\steamapps\\common\\Warhammer 40,000 DARKTIDE\\mods\\mod_load_order.txt',
    'E:\\Steam\\steamapps\\common\\Warhammer 40,000 DARKTIDE\\mods\\mod_load_order.txt',
    'F:\\Steam\\steamapps\\common\\Warhammer 40,000 DARKTIDE\\mods\\mod_load_order.txt',
    'C:\\SteamLibrary\\steamapps\\common\\Warhammer 40,000 DARKTIDE\\mods\\mod_load_order.txt',
    'D:\\SteamLibrary\\steamapps\\common\\Warhammer 40,000 DARKTIDE\\mods\\mod_load_order.txt',
    'E:\\SteamLibrary\\steamapps\\common\\Warhammer 40,000 DARKTIDE\\mods\\mod_load_order.txt',
    'F:\\SteamLibrary\\steamapps\\common\\Warhammer 40,000 DARKTIDE\\mods\\mod_load_order.txt'
  ];
  
  for (const filePath of standardPaths) {
    if (existsSync(filePath)) {
      return filePath;
    }
  }
  
  return DEFAULT_PATH;
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
    
    if (existsSync(newPath)) {
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
