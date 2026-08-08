import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import https from 'https';

const url = 'https://github.com/New-Start-Studios/site-assets/archive/refs/heads/main.zip';
const targetDir = path.join(process.cwd(), 'static', 'cdn');
const zipFile = path.join(process.cwd(), 'site-assets.zip');

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const options = {
            headers: {
                'User-Agent': 'node.js'
            }
        };

        https.get(url, options, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301 || response.statusCode === 307) {
                // Follow redirect
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }

            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

async function main() {
    try {
        console.log('Checking submodule assets...');
        // Check if target dir has content (simply look for a sentinel file or just the directory)
        // If git submodule failed or is empty, we download
        if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
            console.log('static/cdn is not empty. Assuming submodule or previous download exists.');
            // Uncomment if we want to force download even if dir exists but might be empty/wrong
            // console.log('Proceeding to download anyway to ensure latest...');
        } else {
            console.log('static/cdn is empty or missing. Downloading assets...');
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            console.log(`Downloading ${url}...`);
            await downloadFile(url, zipFile);

            console.log('Extracting assets...');
            const zip = new AdmZip(zipFile);
            const zipEntries = zip.getEntries();

            // Extract to temp folder first to handle the root folder in zip
            const tempExtractDir = path.join(process.cwd(), 'temp_assets');
            zip.extractAllTo(tempExtractDir, true);

            // Move contents from template-extracted/site-assets-main to static/cdn
            const extractedRoot = fs.readdirSync(tempExtractDir)[0]; // likely 'site-assets-main'
            const sourceDir = path.join(tempExtractDir, extractedRoot);

            // Helper to copy recursive
            function copyRecursiveSync(src, dest) {
                const exists = fs.existsSync(src);
                const stats = exists && fs.statSync(src);
                const isDirectory = exists && stats.isDirectory();
                if (isDirectory) {
                    if (!fs.existsSync(dest)) fs.mkdirSync(dest);
                    fs.readdirSync(src).forEach((childItemName) => {
                        copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
                    });
                } else {
                    fs.copyFileSync(src, dest);
                }
            }

            console.log(`Moving assets from ${sourceDir} to ${targetDir}...`);
            copyRecursiveSync(sourceDir, targetDir);

            // Cleanup
            console.log('Cleaning up...');
            fs.unlinkSync(zipFile);
            fs.rmSync(tempExtractDir, { recursive: true, force: true });

            console.log('Asset download complete.');
        }

    } catch (error) {
        console.error('Error downloading assets:', error);
        process.exit(1);
    }
}

main();
