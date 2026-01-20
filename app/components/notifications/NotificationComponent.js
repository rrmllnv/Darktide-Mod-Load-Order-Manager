export class NotificationComponent {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.notifications = new Map();
        this.notificationQueue = [];
        this.notificationIdCounter = 0;
        this.defaultDuration = 5000;
        this.maxNotifications = 5;
    }
    
    async init() {
        this.container = document.getElementById('notifications-container');
        if (!this.container) {
            console.error('Notifications container not found');
            return;
        }
        this.updateLocalization();
    }
    
    t(key, params = {}) {
        if (this.app.localeManager) {
            return this.app.localeManager.t(key, params);
        }
        return this.app.t(key, params);
    }
    
    show(type, message, options = {}) {
        if (!this.container) {
            console.error('Notifications container not initialized');
            return null;
        }
        
        const id = ++this.notificationIdCounter;
        const duration = options.duration !== undefined ? options.duration : this.defaultDuration;
        const closable = options.closable !== undefined ? options.closable : true;
        
        const notificationData = {
            id: id,
            type: type,
            message: message,
            duration: duration,
            closable: closable,
            timestamp: Date.now()
        };
        
        // Если есть место, показываем сразу, иначе добавляем в очередь
        if (this.notifications.size < this.maxNotifications) {
            this.displayNotification(notificationData);
        } else {
            this.notificationQueue.push(notificationData);
        }
        
        return id;
    }
    
    displayNotification(notificationData) {
        const { id, type, message, duration, closable } = notificationData;
        
        const notification = this.createNotification(id, type, message, closable);
        this.container.appendChild(notification.element);
        
        this.notifications.set(id, {
            element: notification.element,
            type: type,
            message: message,
            timeoutId: null,
            closeButton: notification.closeButton,
            timestamp: notificationData.timestamp
        });
        
        // Анимация появления
        requestAnimationFrame(() => {
            notification.element.classList.add('notification-show');
        });
        
        // Автоматическое закрытие
        if (duration > 0) {
            const timeoutId = setTimeout(() => {
                this.close(id);
            }, duration);
            this.notifications.get(id).timeoutId = timeoutId;
        }
    }
    
    createNotification(id, type, message, closable) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.dataset.notificationId = id;
        
        const icon = this.getIcon(type);
        const typeLabel = this.getTypeLabel(type);
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${icon}</div>
                <div class="notification-text">
                    <div class="notification-type">${typeLabel}</div>
                    <div class="notification-message">${message}</div>
                </div>
                ${closable ? '<button class="notification-close" aria-label="Close">&times;</button>' : ''}
            </div>
        `;
        
        const closeButton = notification.querySelector('.notification-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.close(id);
            });
        }
        
        // Закрытие по клику на само уведомление (если нет кнопки закрытия)
        if (!closable) {
            notification.addEventListener('click', () => {
                this.close(id);
            });
        }
        
        return {
            element: notification,
            closeButton: closeButton
        };
    }
    
    getIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        return icons[type] || icons.info;
    }
    
    getTypeLabel(type) {
        const labels = {
            success: this.t('notifications.types.success'),
            error: this.t('notifications.types.error'),
            warning: this.t('notifications.types.warning'),
            info: this.t('notifications.types.info')
        };
        return labels[type] || labels.info;
    }
    
    close(id) {
        const notification = this.notifications.get(id);
        if (!notification) {
            return;
        }
        
        // Очистка таймера
        if (notification.timeoutId) {
            clearTimeout(notification.timeoutId);
        }
        
        // Анимация исчезновения
        notification.element.classList.add('notification-hide');
        
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            this.notifications.delete(id);
            
            // Показываем следующее уведомление из очереди, если есть место
            this.processQueue();
        }, 300);
    }
    
    processQueue() {
        // Показываем уведомления из очереди пока есть место
        while (this.notifications.size < this.maxNotifications && this.notificationQueue.length > 0) {
            const nextNotification = this.notificationQueue.shift();
            this.displayNotification(nextNotification);
        }
    }
    
    closeAll() {
        const ids = Array.from(this.notifications.keys());
        ids.forEach(id => this.close(id));
    }
    
    updateLocalization() {
        // Обновление уже отображаемых уведомлений не требуется,
        // так как текст сообщения не меняется
        // Но можно обновить типы, если нужно
    }
}
