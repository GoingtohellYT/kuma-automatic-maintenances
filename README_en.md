# Kuma automatic maintenances

Kuma automatic maintenances is a tool that creates Uptime Kuma maintenances when a container is being automatically updated by Watchtower.

## How it works

Every time the program runs, it compares the creation date of each container on the system wit the last push date on the Docker Hub. If the container's creation date is the most recent, then it is up to date, else, a maintenance is being created in Uptime Kuma.

The whole allows the disapperance of "service down" notifications on container updates, without the need of increasing the amount of trials for each probe before it is displayed as offline. Il also permits to track maintenances dates from Uptime Kuma.

## Prerequisites

- NodeJS version 18
    - `curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -`
    - `sudo apt update`
    - `sudo apt install nodejs`
- NPM (installed with NodeJS)
- an [Uptime Kuma](https://github.com/louislam/Uptime Kuma) instance with _2FA disabled_ and the probe names corresponding to either the containers' names or repository
- a [Watchtower](https://github.com/containrrr/watchtower/) instance, or similar tool, to automatically update containers

## Installation

1. clone the repo : `git clone https://github.com/GoingtohellYT/kuma-automatic-maintenances.git`
2. make the shell scripts executable : `chmod +x pre-script.sh` et `chmod +x post-script.sh`
3. install NodeJS dependencies with `npm install`
4. make sure Watchtower is being executed at specific hours using the cron policy (for example "30 0 12,0 * * *" to have it run every day at 12h 00min 30s and 00h 00min 30s)
5. add the moment of executing the scripts in the crontab (the pre-script before Watchtower and the post-script after -> for example "0 12,0 * * *" and "1 12,0 * * *")
    1. modify the crontab
       `crontab -e`
    2. add the tasks at the end of the file
       `[TIME USING CRON SYNTAX] [PATH/TO/pre-script.sh]`
       `[TIME USING CRON SYNTAX] [PATH/TO/post-script.sh]`
    3. save and exit
6. insert your **login** and **password** in the _settings.json_ file
7. specify if the names of your probes in _Uptime Kuma_ corresponds to the name of your containers or to their repository in the _settings.json_ file
8. insert the **url** of your _Uptime Kuma_ instance in the _settings.json_ file

## Settings and environment variables

All the settings and environment variables are located in the _settings.json_ file.

| Settings / ENV | Action | Possible values |
|----------|----------|----------|
| probe-type | defines if the probes' names in _Uptime Kuma_ correspond to the containers' name or their repository | _"repo"_ for repository and _"name"_ for the name |
| max-update-delay | defines the maximum time interval between the creation and the deletion of the maintenance (in minutes) | any integer higher than 0 |
| max-logs-size | defines the maximum size of the logs file (in MB) -> when this size is exceeded, logs are deleted | any positive integer or float higher (0 deletes logs at each execution) |
| log-level | defines the desired verbosity for the logs | - "info" for all logs logs (no maintenance deleted/created, maintenance deleted/created, deletion of logs, errors) |
|           |                         | - "low" for when a maintenance is deleted/created and errors |
|           |                         | - "error" for errors only |
|           |                         | - "none" for no logs (max-logs-size is then no longer important) |
|            |                                           |
| containers | defines containers to ignore | list that contains exceptions. Caution !! Placing the **registry** will exclude all containers using an image from this **registry**, the same thing applies to the **namespace** and the **tag** ! To exclude a container only, use its **repository**. |
|            |                                           |
| login | defines the login used to connect to Uptime Kuma | your login as a string |
| password | defines the password used to connect to Uptime Kuma | your password as a string |
| url | defines the url used to connect to Uptime Kuma | the url of your instance as a string |

## Limitations

As of right now, this program only works with images coming from the **Docker Hub**. All containers coming from other registries must be added to the **exception list**.

This program can only check for updates for container on **the same machine**. If you have multiple devices, you will need **one instance per device**.

## Notes

You will see an error on the first execution. This is an expected behavior and is caused by the absence of the logs file which will then be created. If you do not want to see this error appear, you may create the file yourself before the first execution using `touch logs.txt`.
