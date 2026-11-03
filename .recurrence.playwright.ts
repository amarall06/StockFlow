import{defineConfig}from'@playwright/test'
export default defineConfig({testDir:'./tests/browser',timeout:45000,use:{baseURL:'http://127.0.0.1:4214',channel:'chrome',trace:'retain-on-failure'}})
