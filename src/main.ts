import { createApp } from 'vue'
import App from './App.vue'
import { format } from 'date-fns'

Date.prototype.toJSON = function () {
    try {
        return format(this, 'yyyy-MM-dd HH:mm:ss.SSS')
    } catch (e) {
        return 'Invalid Date: ' + (e as Error).message
    }
}

createApp(App).mount('#app')
