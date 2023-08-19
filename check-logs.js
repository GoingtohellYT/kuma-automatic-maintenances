const fs = require('fs');

// fonction that aims to determine if the size of the logs file exceeds the limit defined by the user and truncates the file if the size limit has been exceeded
function checkLogsSize() {
    const currentDate = new Date();
    const logsPath = 'logs.txt';

    // get the size limit (in MB) from the JSON file
    const settings_file = fs.readFileSync("settings.json", 'utf8');
    const jsonData = JSON.parse(settings_file);
    const max_size = jsonData.settings["max-logs-size"];
    const log_level = jsonData.settings["log-level"];

    try {
         // get the file size
        const stats = fs.statSync(logsPath);
        const logsSize = stats.size;
        // truncate if too large
        if (logsSize / 1000000 > max_size) {
            fs.truncateSync(logsPath, 0)
            if (log_level == 'info') {
                fs.writeFileSync(logsPath, `\nLe fichier des logs a été vidé à ${currentDate}\n`, {flag: 'a'});
            }
        } else {}
    } catch (err) {
        if (log_level != 'none') {
            fs.writeFileSync(logsPath, `\nLa suppression du contenu du fichier de logs a échouée à ${currentDate} en raison de : ${err}\n`, {flag: 'a'});
        }
    }
}

module.exports = checkLogsSize;
