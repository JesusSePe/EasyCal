const { strings } = require('./translations.js')

module.exports = {
    // Function to get locales and replace variables
    getLocale: function (language, string, ...vars) {
        let locale = strings[language][string];

        let count = -1;
        locale = locale.replace(/%VAR%/g, () => vars[count] !== null ? (count += 1, vars[count]) : "%VAR%");

        return `${locale}`;
    }

}
