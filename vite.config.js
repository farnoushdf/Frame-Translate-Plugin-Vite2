import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
// https://vite.dev/config/
export default defineConfig({
    plugins: [preact(), viteSingleFile()],
    define: {
        "process.env.VITE_AWS_ACCESS_KEY_ID": JSON.stringify(process.env.VITE_AWS_ACCESS_KEY_ID),
        "process.env.VITE_AWS_SECRET_ACCESS_KEY": JSON.stringify(process.env.VITE_AWS_SECRET_ACCESS_KEY),
    },
});
