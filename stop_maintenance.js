const { execSync } = require('child_process'); // To execute commands
const request = require('sync-request'); // To request the Docker Hub API with a synchronous function
const puppeteer = require('puppeteer'); // To scrape Uptime-Kuma
const fs = require('fs');

function wait(duration) {
    return new Promise((resolve) => {
      setTimeout(resolve, duration);
    });
}

var running_date = new Date();

var containers_ids = execSync("docker ps -q", {encoding: 'utf8'}).split('\n'); // get container IDs
containers_ids.pop();
// console.log(containers_ids);

var containers_data = []
var containers_to_update = ["something"]

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

        // console.log("Namespace :", namespace, "; repository:", repository, "; tag :", tag, "; date de création:", parsedDate);
    } 
}

// console.log('\n' + 'Table:', containers_data);

const default_hub_url = "https://hub.docker.com/v2/namespaces/container-namespace/repositories/container-repo/tags/container-tag";

var pushed_dates = [];

for (const container of containers_data){
    const hub_url = default_hub_url.replace("container-namespace", `${container[0]}`).replace("container-repo", `${container[1]}`).replace("container-tag", `${container[2]}`);
    // console.log(hub_url)

    const settings_file = fs.readFileSync("settings.json", 'utf8');
    const jsonData = JSON.parse(settings_file);
    const probeType = jsonData.settings["probe-type"];

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
        pushed_dates.push(pushed_parsedDate)
        // console.log(pushed_parsedDate);

    } catch (error) {
        if (log_level != 'none') {
            fs.writeFileSync("logs.txt", `Erreur lors de la suppression de la maintenance à ${running_date} en raison de : ${error}\n`, {flag: 'a'});
        }
        // console.log(error);
        process.exit();
    }
}

const max_delay = jsonData.settings["max-update-delay"];

while (containers_to_update.length > 0 && ((new Date() - running_date)/1000/60 < max_delay)) {
    containers_to_update = []
    wait(10000)
    for (const [index, container] of containers_data.entries()) {
        if (container[3] - pushed_dates[index] > 0) {
            
        } else {
            containers_to_update.push(container[1])
        }
        // console.log(containers_to_update);
    }
}

// console.log("Ces conteneurs doivent être mis à jour : ", containers_to_update);

// <----- Part 2 : delete the maintenance ----->

if (containers_to_update.length != 0 && (log_level == "info" || log_level == 'low')) {
    fs.writeFileSync("logs.txt", `Suppression de la maintenance car le délai maximal de ${max_delay} minutes est écoulé\n`, {flag: 'a'});
}

running_date = new Date();

(async () => {
    try {
        const browser = await puppeteer.launch({headless: true}); // creates an instance
        const page = await browser.newPage(); //opening a blank page in browser
        await page.goto(`${server_url}/maintenance`); // connects to the right page in Uptime Kuma

        try { // try login in if page appears
            const login_entry = await page.$("#floatingInput");
            await login_entry.click();
            await login_entry.type(login);

            const passwd = await page.$("#floatingPassword");
            await passwd.click();
            await passwd.type(pwd);

            const connect = await page.$(".w-100");
            await connect.click();
        } catch {}

        await wait(1000);

        var maintenance_titles = (await page.$$(".title"));
        // console.log(maintenance_titles);

        var maintenance_titles_array = Array.from(maintenance_titles)
        maintenance_titles_array = await Promise.all(maintenance_titles_array.map(maintenance_title => maintenance_title.evaluate(node => node.textContent)));
        // console.log(maintenance_titles_array)

        var index = undefined;
        for (let i = 0; i < maintenance_titles_array.length; i++){
            // console.log(maintenance_titles_array[i]);
            if (maintenance_titles_array[i].includes("Maintenance automatique de")) {
                index = i;
                break;
            }
        }

        if (!(index == undefined)){
            const remove_button = await page.$$(".btn-danger"); // find all buttons to remove maintenances
            await remove_button[index - 1].click();

            await wait(1000);
            
            const confirm_btn = await page.$('.btn-danger[data-bs-dismiss="modal"]') // isolate the confirm button
            await confirm_btn.click()

            // console.log("Maintenance supprimée");

            await browser.close();
            if (log_level == 'info' || log_level == 'low') {
                fs.writeFileSync("logs.txt", `Maintenance supprimée à ${running_date}\n`, {flag: 'a'});
            }
            process.exit();
        }

        await browser.close()
        if (log_level == "info") {
            fs.writeFileSync("logs.txt", `Aucune maintenance à supprimer à ${running_date}\n`, {flag: 'a'});
        }

    } catch (error) {
        if (log_level != 'none') {
            fs.writeFileSync("logs.txt", `Erreur lors de la suppression de la maintenance à ${running_date} en raison de : ${error}\n`, {flag: 'a'});
        }     
        // console.error("On a un problème :", error);
        process.exit();
    }
}) ();
