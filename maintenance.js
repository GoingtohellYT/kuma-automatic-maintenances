// Script that aims to compare the creation dates of my containers and the latest push made towards the Docker Hub (for the same tag) to see if they are up to date
// and create a maintenance inside of Uptime-Kuma if a container is not. This way, you do not need to increase check interval in Uptime-Kuma to prevent 'service down'
// notifications and you can track when each container got updated in Uptime-Kuma probe history!

// Import dependencies
const { execSync } = require('child_process'); // To execute commands
const request = require('sync-request'); // To request the Docker Hub API with a synchronous function
const puppeteer = require('puppeteer'); // To scrape Uptime-Kuma
const fs = require('fs'); // For file management
const checkLogsSize = require('./check-logs.js') // To check if the logs file size limit is respected

// We check that the logs file size is still inferior to the limit and if not we truncate it
checkLogsSize();

var containers_ids = execSync("docker ps -q", {encoding: 'utf8'}).split('\n'); // get container IDs
containers_ids.pop();
// console.log(containers_ids);

const currentDate = new Date();

var containers_data = []
var containers_to_update = []
var containers_updated = []

// access the user config JSON file
const settings_file = fs.readFileSync("settings.json", 'utf8');
const jsonData = JSON.parse(settings_file);

// retrieve the exception (Uptime-Kuma as you usually don't monitor a service from said service + Watchtower as it won't update itself + containers that are not on the Docker Hub sur as cAdvisor or node-exporter)
const exceptions = jsonData.exceptions.containers;
const log_level = jsonData.settings["log-level"];

// retrieve credentials and server url
const login = jsonData.server["login"];
const pwd = jsonData.server["password"];
const server_url = jsonData.server["url"];

for (const id of containers_ids){
    var image = execSync(`docker inspect --format='{{.Config.Image}}' ${id}`, {encoding: 'utf8'}); // get its full image (namespace/repo:tag)
    const name = execSync(`docker inspect --format='{{.Name}}' ${id} | cut -c 2-`, {encoding: 'utf8'}).split("\n")[0]; // get its name
    // console.log(name)
    const creation = execSync(`docker inspect --format='{{.Created}}' ${id}`, {encoding: 'utf8'}); // get its creation date

    const shouldExcludeImage = exceptions.some(substring => image.includes(substring));

    if (!shouldExcludeImage) {
        containers_data.push([]); // Add a new line in the containers_data table
        // console.log(containers_data);

        const year = Number(creation.substring(0, 4));
        const month = Number(creation.substring(5, 7)) - 1; // Month is zero-based
        const day = Number(creation.substring(8, 10));
        const hours = Number(creation.substring(11, 13));
        const minutes = Number(creation.substring(14, 16));
        const seconds = Number(creation.substring(17, 19));
        const milliseconds = Number(creation.substring(20, 23));

        const parsedDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds, milliseconds)); // create the Date object

        // console.log(parsedDate)

        // Break the image into three separate parts (namespace, repo and tag)
        image = image.split("\n")[0];
        if (image.includes("/") && image.includes(':')) {   
            var namespace = image.split("/")[0];
            var repository = image.split("/")[1].split(":")[0];
        } else if (!(image.includes("/")) && image.includes(':')){
            var namespace = "library";
            var repository = image.split(":")[0];
        } else if (image.includes("/") && !(image.includes(":"))){
            var namespace = image.split("/")[0];
            var repository = image.split("/")[1];
        }

        if (image.includes(':')) {
            var tag = image.split(":")[1];
        } else {
            var tag = "latest";
        }
        
        // Add all elements to the line in the right order to facilitate later manipulations (namespace, repo, tag, date)
        containers_data[containers_data.length - 1].push(namespace);
        containers_data[containers_data.length - 1].push(repository);
        containers_data[containers_data.length - 1].push(tag);
        containers_data[containers_data.length - 1].push(parsedDate);
        containers_data[containers_data.length - 1].push(name);

        // console.log("Namespace :", namespace, "; repository:", repository, "; tag :", tag, "; date de création:", parsedDate);
    } 
}

// console.log('\n' + 'Table:', containers_data);

const default_hub_url = "https://hub.docker.com/v2/namespaces/container-namespace/repositories/container-repo/tags/container-tag"; // define a model to modify for the URL

for (const container of containers_data){
    const hub_url = default_hub_url.replace("container-namespace", `${container[0]}`).replace("container-repo", `${container[1]}`).replace("container-tag", `${container[2]}`);
    // console.log(hub_url);

    const probeType = jsonData.settings["probe-type"]; // retrieve info indicating if the probe is named after the container's name or repository

    try {
        const response = request('GET', hub_url);
        const data = JSON.parse(response.getBody('utf8'));
        
        const tag_last_pushed = data.tag_last_pushed;

        const pushed_year = Number(tag_last_pushed.substring(0, 4));
        const pushed_month = Number(tag_last_pushed.substring(5, 7)) - 1; // Month is zero-based
        const pushed_day = Number(tag_last_pushed.substring(8, 10));
        const pushed_hours = Number(tag_last_pushed.substring(11, 13));
        const pushed_minutes = Number(tag_last_pushed.substring(14, 16));
        const pushed_seconds = Number(tag_last_pushed.substring(17, 19));
        const pushed_milliseconds = Number(tag_last_pushed.substring(20, 23));

        const pushed_parsedDate = new Date(Date.UTC(pushed_year, pushed_month, pushed_day, pushed_hours, pushed_minutes, pushed_seconds, pushed_milliseconds)); // create the Date object

        // Define if container is up to date or not and append it to the corresponding array
        if (pushed_parsedDate > container[3]) {
            // console.log("Ce conteneur doit être mis à jour");
            if (probeType == "repo") {
                containers_to_update.push(container[1]);
            } else if (probeType == "name") {
                containers_to_update.push(container[4]);
            }
        } else {
            // console.log("Ce conteneur est à jour !");
            if (probeType == "repo") {
                containers_updated.push(container[1]);
            } else if (probeType == "name") {
                containers_updated.push(container[4]);
            }
        }
    } catch (error) {
        // console.log(error);
        if (log_level != "none") {
            fs.writeFileSync("logs.txt", `\nLa création de la maintenance a échouée à ${currentDate} en raison de : ${error}\n`, {flag: 'a'});
        }
        process.exit();
    }
}

console.log("Ces conteneurs doivent être mis à jour : ", containers_to_update);
console.log("Ces conteneurs sont à jour :", containers_updated);

// <------ Part 2 : Maintenance creation ------>
function wait(duration) {
    return new Promise((resolve) => {
      setTimeout(resolve, duration);
    });
}

async function createMaintenance () {
    try {
        const browser = await puppeteer.launch({headless: true}); // creates an instance
        const page = await browser.newPage(); //opening a blank page in browser
        await page.goto(`${server_url}/add-maintenance`); // connects to the right page in Uptime Kuma
        // console.log("Sur la page");

        // console.log(page.url())

        try{ // try login in if page appears
            const login_entry = await page.$("#floatingInput");
            await login_entry.click();
            await login_entry.type(login);

            const passwd = await page.$("#floatingPassword");
            await passwd.click();
            await passwd.type(pwd);

            const connect = await page.$(".w-100");
            await connect.click();

            //await wait(1000);

            //const otp = await page.$("#otp");
            //await otp.click();
            //await otp.type(""); // enter 2FA code --> not optimal as code changes every 30 seconds, I suggest disabling 2FA except if you have a way of retrieving the code automatically

            //await connect.click();
        } catch {}

        await wait(1000);

        var titre = await page.$('#name');
        await titre.click();
        await titre.type(`Maintenance automatique de ${containers_to_update.join(', ')}`);
        // console.log("Titre modifié");
        
        var description = await page.$("#description");
        await description.click();
        await description.type("Maintenance de services automatisée par Watchtower");
        await description.press("Escape");
        // console.log("Description modifiée");

        var sondes = await page.$('#affected_monitors');
        
        for (let i = 0; i < containers_to_update.length; i++) {
            letters_nb = containers_to_update[i].length;
            await sondes.type(containers_to_update[i]);
            await sondes.press('Enter');

            for (let i = 0; i < letters_nb; i++) {
                await sondes.press("Backspace")
            }
        }
       
        await sondes.press('Escape');
        // console.log("Sondes modifiées");

        const status_checkbox = await page.$("#show-on-all-pages")
        await status_checkbox.click()

        await page.select("#strategy", 'manual');
        // console.log("Stratégie modifiée");

        var sauvegarder = await page.$("#monitor-submit-btn");
        await sauvegarder.click();
        await wait(250)
        // console.log("Ajout de la maintenance");

        await browser.close();
        // console.log("Fermeture de l'instance");

       fs.writeFileSync("logs.txt", `\nMaintenance créée pour ${containers_to_update.join(", ")} à ${currentDate}\n`, {flag: 'a'});
    } catch (error) {
        if (log_level != "none") {
            fs.writeFileSync("logs.txt", `\nLa création de la maintenance a échouée à ${currentDate} en raison de : ${error}\n`, {flag: 'a'});
        }   
        // console.error("On a un problème :", error);
        process.exit();
    }   
};

if (containers_to_update.length > 0 && log_level != "none" && log_level != "error") {
    createMaintenance()
} else if (log_level == 'info') {
    fs.writeFileSync("logs.txt", `\nAucune maintenance créée à ${currentDate}\n`, {flag: "a"});
}
