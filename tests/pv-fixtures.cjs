// Optional local case studies; the public repository does not distribute these inventories.
const path = require('node:path');
const os = require('node:os');
module.exports = {
  full: process.env.PEFDPP_PV_FULL_FILE || path.join(os.homedir(), 'Desktop', 'PV_FULL_publication.ttl'),
  simplified: process.env.PEFDPP_PV_SIMPLIFIED_FILE || path.join(os.homedir(), 'Desktop', 'PV_SIMPLIFIED_publication.ttl')
};
