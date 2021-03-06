const path = require('path');
const { which, exec } = require('shelljs');
const semver = require('semver');

const filePath = path.join(__dirname, 'dkimpy', 'dkim', 'dkimverify.py');

// ensure python installed
if (!which('python')) throw new Error(`Python v2.7+ or v3.5+ is required`);

const silent = process.env.NODE_ENV !== 'test';
const options = { silent, async: true };

// ensure python v2.7+ or v3.5+
let version = exec('python --version', { silent });
version = (version.stdout ? version.stdout : version.stderr)
  .split(' ')[1]
  .trim();

if (semver.satisfies(version, '> 3') && !semver.satifies(version, '>= 3.5'))
  throw new Error(
    `Python v3.5+ is required, you currently have v${version} installed`
  );
else if (!semver.satisfies(version, '>= 2.7'))
  throw new Error(
    `Python v2.7+ or v3.5+ is required, you currently have v${version} installed`
  );

module.exports = function(rawEmail) {
  return new Promise((resolve, reject) => {
    const child = exec(`python ${filePath}`, options);
    const stdout = [];
    const stderr = [];
    child.stderr.on('data', data => {
      stderr.push(data);
    });
    child.stdout.on('data', data => {
      stdout.push(data);
    });
    child.stdin.write(rawEmail);
    child.stdin.end();
    child.on('close', code => {
      // exits with code 1 if failed
      if (code === 1) return resolve(false);
      if (stderr.length > 0) return reject(new Error(stderr.join('').trim()));
      const output = stdout.join('').trim();
      if (output && output === 'signature ok') return resolve(true);
      reject(new Error(output));
    });
  });
};
