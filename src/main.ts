import { createApp } from 'vue'
import DevApp from './App.dev.vue'
import SiteApp from './App.site.vue'
import { format } from 'date-fns'

Date.prototype.toJSON = function () {
    try {
        return format(this, 'yyyy-MM-dd HH:mm:ss.SSS')
    } catch (e) {
        return 'Invalid Date: ' + (e as Error).message
    }
}

createApp(import.meta.env.MODE === 'site' ? SiteApp : DevApp).mount('#app')
