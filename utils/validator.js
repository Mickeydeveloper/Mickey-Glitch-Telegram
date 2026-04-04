const { ValidationError } = require('./errors');

class Validator {
    static phoneNumber(number, countryCode = null) {
        if (!number) throw new ValidationError('Phone number is required', 'phoneNumber');

        const cleaned = number.replace(/[^0-9]/g, '');

        if (cleaned.length < 10 || cleaned.length > 15) {
            throw new ValidationError('Phone number must be between 10-15 digits', 'phoneNumber');
        }

        return cleaned;
    }

    static url(urlString) {
        if (!urlString) throw new ValidationError('URL is required', 'url');

        try {
            const url = new URL(urlString);
            return url.toString();
        } catch (error) {
            throw new ValidationError('Invalid URL format', 'url');
        }
    }

    static githubUrl(urlString) {
        const url = this.url(urlString);

        if (!url.includes('github.com')) {
            throw new ValidationError('Must be a valid GitHub URL', 'url');
        }

        return url;
    }

    static socialMediaUrl(platform, urlString) {
        const url = this.url(urlString);
        const platforms = {
            facebook: 'facebook.com',
            tiktok: 'tiktok.com',
            twitter: 'twitter.com|x.com',
            instagram: 'instagram.com',
            youtube: 'youtube.com'
        };

        const pattern = platforms[platform.toLowerCase()];
        if (!pattern) {
            throw new ValidationError(`Unsupported platform: ${platform}`, 'platform');
        }

        if (!new RegExp(pattern).test(url)) {
            throw new ValidationError(`Must be a valid ${platform} URL`, 'url');
        }

        return url;
    }

    static telegramUserId(userId) {
        if (!userId) throw new ValidationError('Telegram user ID is required', 'userId');

        const id = String(userId).trim();
        if (!/^\d+$/.test(id)) {
            throw new ValidationError('Invalid Telegram user ID format', 'userId');
        }

        return id;
    }

    static whatsappNumber(number) {
        const cleaned = String(number).replace(/[^0-9]/g, '');

        if (cleaned.length < 10 || cleaned.length > 15) {
            throw new ValidationError('WhatsApp number must be between 10-15 digits', 'number');
        }

        return cleaned;
    }

    static jid(jidString) {
        if (!jidString) throw new ValidationError('JID is required', 'jid');

        if (!jidString.includes('@')) {
            throw new ValidationError('Invalid JID format', 'jid');
        }

        return jidString;
    }

    static string(value, minLength = 1, maxLength = Infinity, fieldName = 'string') {
        if (!value) throw new ValidationError(`${fieldName} is required`, fieldName);

        const str = String(value).trim();

        if (str.length < minLength) {
            throw new ValidationError(`${fieldName} must be at least ${minLength} characters`, fieldName);
        }

        if (str.length > maxLength) {
            throw new ValidationError(`${fieldName} must not exceed ${maxLength} characters`, fieldName);
        }

        return str;
    }

    static integer(value, min = null, max = null, fieldName = 'number') {
        const num = Number(value);

        if (!Number.isInteger(num)) {
            throw new ValidationError(`${fieldName} must be an integer`, fieldName);
        }

        if (min !== null && num < min) {
            throw new ValidationError(`${fieldName} must be at least ${min}`, fieldName);
        }

        if (max !== null && num > max) {
            throw new ValidationError(`${fieldName} must not exceed ${max}`, fieldName);
        }

        return num;
    }

    static email(emailString) {
        if (!emailString) throw new ValidationError('Email is required', 'email');

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(emailString)) {
            throw new ValidationError('Invalid email format', 'email');
        }

        return emailString.toLowerCase();
    }

    static enum(value, allowedValues, fieldName = 'value') {
        if (!allowedValues.includes(value)) {
            throw new ValidationError(
                `${fieldName} must be one of: ${allowedValues.join(', ')}`,
                fieldName
            );
        }

        return value;
    }

    static boolean(value) {
        if (typeof value === 'boolean') return value;
        if (value === 'true' || value === 1 || value === '1') return true;
        if (value === 'false' || value === 0 || value === '0') return false;
        throw new ValidationError('Value must be a boolean', 'boolean');
    }

    static array(value, minLength = 0, maxLength = Infinity, fieldName = 'array') {
        if (!Array.isArray(value)) {
            throw new ValidationError(`${fieldName} must be an array`, fieldName);
        }

        if (value.length < minLength) {
            throw new ValidationError(`${fieldName} must have at least ${minLength} items`, fieldName);
        }

        if (value.length > maxLength) {
            throw new ValidationError(`${fieldName} must not exceed ${maxLength} items`, fieldName);
        }

        return value;
    }
}

module.exports = Validator;
