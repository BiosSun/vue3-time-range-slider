import { createApp } from 'vue'
import App from './App.vue'
import { format } from 'date-fns'

Date.prototype.toJSON = function () {
    return format(this, 'yyyy-MM-dd HH:mm:ss.SSS')
}

createApp(App).mount('#app')
