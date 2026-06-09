const xss = require('xss');


const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
        return;
    }
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            obj[key] = xss(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
        }
    }
};

const sanitize = (req, res, next) => {
    if (req.body) sanitizeObject(req.body);
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);
    next();
};

module.exports = sanitize;
