#!/usr/bin/env node

/**
 * Quick Test Runner
 * Checks if netlify dev is running before executing tests
 */

const http = require('http');
const { spawn } = require('child_process');

const BASE_URL = 'http://localhost:8888';

function checkServer() {
    return new Promise((resolve) => {
        const req = http.get(BASE_URL, (res) => {
            resolve(res.statusCode === 200);
        });

        req.on('error', () => {
            resolve(false);
        });

        req.setTimeout(2000, () => {
            req.destroy();
            resolve(false);
        });
    });
}

async function main() {
    console.log('🔍 Checking if netlify dev is running...');

    const isRunning = await checkServer();

    if (!isRunning) {
        console.error('\n❌ Error: netlify dev is not running on http://localhost:8888');
        console.log('\n📝 Please start the dev server first:');
        console.log('   netlify dev\n');
        process.exit(1);
    }

    console.log('✅ Server is running!\n');
    console.log('🧪 Running Playwright tests...\n');

    // Get test mode from command line args
    const args = process.argv.slice(2);
    const mode = args[0] || 'test';

    let command;
    if (mode === 'ui') {
        command = spawn('npx', ['playwright', 'test', '--ui'], {
            stdio: 'inherit',
            shell: true
        });
    } else if (mode === 'headed') {
        command = spawn('npx', ['playwright', 'test', '--headed'], {
            stdio: 'inherit',
            shell: true
        });
    } else if (mode === 'debug') {
        command = spawn('npx', ['playwright', 'test', '--debug'], {
            stdio: 'inherit',
            shell: true
        });
    } else {
        command = spawn('npx', ['playwright', 'test'], {
            stdio: 'inherit',
            shell: true
        });
    }

    command.on('close', (code) => {
        if (code === 0) {
            console.log('\n✅ All tests completed!');
            console.log('📊 View report: npx playwright show-report\n');
        } else {
            console.log('\n❌ Some tests failed. Check the output above.\n');
        }
        process.exit(code);
    });
}

main();
