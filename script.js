class WebhookTool {
    constructor() {
        this.isSpamming = false;
        this.spamInterval = null;
        this.messageCount = 0;
        this.startTime = null;
        
        this.initElements();
        this.bindEvents();
        this.loadFromStorage();
    }

    initElements() {
        // Inputs
        this.webhookUrlInput = document.getElementById('webhookUrl');
        this.messageContentInput = document.getElementById('messageContent');
        this.delayInput = document.getElementById('delay');
        
        // Buttons
        this.validateBtn = document.getElementById('validateBtn');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.deleteBtn = document.getElementById('deleteBtn');
        
        // Cards and tabs
        this.actionsCard = document.getElementById('actionsCard');
        this.tabs = document.querySelectorAll('.tab');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.statsElement = document.getElementById('stats');
        this.toastContainer = document.getElementById('toastContainer');
    }

    bindEvents() {
        this.validateBtn.addEventListener('click', () => this.validateWebhook());
        this.startBtn.addEventListener('click', () => this.startSpamming());
        this.stopBtn.addEventListener('click', () => this.stopSpamming());
        this.deleteBtn.addEventListener('click', () => this.deleteWebhook());
        
        // Tab switching
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
        
        // Auto-save inputs
        [this.webhookUrlInput, this.messageContentInput, this.delayInput].forEach(input => {
            input.addEventListener('input', () => this.saveToStorage());
        });
    }

    async validateWebhook() {
        const url = this.webhookUrlInput.value.trim();
        
        if (!url) {
            this.showToast('Please enter a webhook URL', 'error');
            return;
        }

        if (!url.includes('discord.com/api/webhooks/')) {
            this.showToast('Invalid Discord webhook URL', 'error');
            return;
        }

        this.validateBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Validating...
        `;
        this.validateBtn.disabled = true;

        try {
            const response = await fetch(url);
            
            if (response.status === 200) {
                this.showToast('Webhook is valid!', 'success');
                this.actionsCard.style.display = 'block';
                this.saveToStorage();
            } else if (response.status === 404) {
                this.showToast('Webhook not found (already deleted?)', 'error');
            } else {
                this.showToast('Webhook validation failed', 'error');
            }
        } catch (error) {
            this.showToast('Error validating webhook', 'error');
            console.error('Validation error:', error);
        } finally {
            this.validateBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Submit
            `;
            this.validateBtn.disabled = false;
        }
    }

    async startSpamming() {
        const webhookUrl = this.webhookUrlInput.value.trim();
        const message = this.messageContentInput.value.trim();
        const delay = parseInt(this.delayInput.value) || 20;

        if (!webhookUrl) {
            this.showToast('Please enter a webhook URL', 'error');
            return;
        }

        if (!message) {
            this.showToast('Please enter a message', 'error');
            return;
        }

        if (delay < 10) {
            this.showToast('Delay must be at least 10ms', 'error');
            return;
        }

        this.isSpamming = true;
        this.messageCount = 0;
        this.startTime = Date.now();
        
        this.startBtn.style.display = 'none';
        this.stopBtn.style.display = 'inline-flex';
        
        this.showToast(`Spamming started (${delay}ms delay)`, 'success');

        this.spamInterval = setInterval(async () => {
            try {
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        content: message,
                        username: 'beamed.fun',
                        avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
                    })
                });
                
                this.messageCount++;
                this.updateStats();
                
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }, delay);
    }

    stopSpamming() {
        if (this.spamInterval) {
            clearInterval(this.spamInterval);
            this.spamInterval = null;
        }
        
        this.isSpamming = false;
        this.startBtn.style.display = 'inline-flex';
        this.stopBtn.style.display = 'none';
        
        const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
        this.showToast(`Spamming stopped. Sent ${this.messageCount} messages in ${duration}s`, 'success');
    }

    async deleteWebhook() {
        const webhookUrl = this.webhookUrlInput.value.trim();
        
        if (!webhookUrl) {
            this.showToast('Please enter a webhook URL', 'error');
            return;
        }

        if (!confirm('Are you sure you want to permanently delete this webhook?')) {
            return;
        }

        this.deleteBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Deleting...
        `;
        this.deleteBtn.disabled = true;

        try {
            const response = await fetch(webhookUrl, {
                method: 'DELETE'
            });

            if (response.status === 204) {
                this.showToast('Webhook deleted successfully!', 'success');
                this.actionsCard.style.display = 'none';
                this.webhookUrlInput.value = '';
                localStorage.removeItem('webhookData');
            } else {
                this.showToast('Failed to delete webhook', 'error');
            }
        } catch (error) {
            this.showToast('Error deleting webhook', 'error');
            console.error('Delete error:', error);
        } finally {
            this.deleteBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Webhook
            `;
            this.deleteBtn.disabled = false;
        }
    }

    switchTab(tabName) {
        // Update active tab
        this.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Show active content
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });
    }

    updateStats() {
        if (!this.startTime) return;

        const now = Date.now();
        const elapsed = (now - this.startTime) / 1000;
        const messagesPerSecond = this.messageCount / elapsed;

        this.statsElement.innerHTML = `
            <div>⏱️ Time elapsed: ${elapsed.toFixed(1)}s</div>
            <div>📨 Messages sent: ${this.messageCount}</div>
            <div>🚀 Speed: ${messagesPerSecond.toFixed(1)} msg/s</div>
            <div>⏳ Delay: ${this.delayInput.value || 20}ms</div>
        `;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 0.25rem;">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
                ${type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
            <div>${message}</div>
        `;

        this.toastContainer.appendChild(toast);

        // Remove toast after 5 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    saveToStorage() {
        const data = {
            webhookUrl: this.webhookUrlInput.value,
            messageContent: this.messageContentInput.value,
            delay: this.delayInput.value
        };
        localStorage.setItem('webhookData', JSON.stringify(data));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('webhookData');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.webhookUrlInput.value = data.webhookUrl || '';
                this.messageContentInput.value = data.messageContent || '';
                this.delayInput.value = data.delay || '20';
                
                // Show actions card if we have a webhook URL
                if (data.webhookUrl) {
                    this.actionsCard.style.display = 'block';
                }
            } catch (error) {
                console.error('Error loading saved data:', error);
            }
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WebhookTool();
    
    // Add Enter key support for webhook input
    document.getElementById('webhookUrl').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('validateBtn').click();
        }
    });
});
