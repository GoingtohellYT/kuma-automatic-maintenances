# kuma-automatic-maintenances

Ce programme permet de créer automatiquement une maintenance dans uptime-kuma quand un conteneur Docker doit être mis à jour. Il vise les systèmes qui utilisent des maintenances automatiques pour les conteneurs et permet la disparition des notifications "service down" de uptime-kuma lors des mises à jours, sans nécessiter d'augmenter le nombre d'essais avant de déclarer une sonde hors-ligne. Il permet également un suivi des mises à jours par le biais de l'historique des maintenances dans uptime-kuma.

## Fonctionnement

A chaque exécution, le programme compare la date de création des conteneurs présents sur la machine à la date du dernier push de l'image sur le Docker Hub. Si le conteneur à une date de création plus récente, alors il est à jour, sinon, il doit être mis à jour. Dans le second cas, une maintenance est créée dans uptime-kuma.

## Prérequis

- NodeJS version 18
    - 'curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -'
    - 'sudo apt update'
    - 'sudo apt install nodejs'
- NPM (installé avec NodeJS)
- une instance de [uptime-kuma](https://github.com/louislam/uptime-kuma) avec l'A2F désactivée et les noms des sondes qui correspondent soit au nom des conteneurs, soit au nom des repositories (portainer-ce pour portainer/portainer-ce:latest)
- une instance de [Watchtower](https://github.com/containrrr/watchtower/) ou autre service capable de mettre à jour les conteneurs automatiquement
