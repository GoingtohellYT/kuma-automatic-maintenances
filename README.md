# kuma-automatic-maintenances

Ce programme permet de créer automatiquement une maintenance dans uptime-kuma quand un conteneur Docker doit être mis à jour. Il vise les systèmes utilisant des maintenances automatiques pour les conteneurs et permet la disparition des notifications "service down" lors des mises à jours, sans nécessiter d'augmenter le nombre d'essais avant de déclarer une sonde hors-ligne. Il permet également un suivi des mises à jours par le biais de l'historique des maintenances dans uptime-kuma.

## Fonctionnement

A chaque exécution, le programme compare la date de création des conteneurs présents sur la machine à la date du dernier push de l'image sur le Docker Hub. Si le conteneur a une date de création plus récente, alors il est à jour, sinon, il doit être mis à jour. Dans le second cas, une maintenance est créée dans uptime-kuma.

## Prérequis

- NodeJS version 18
    - `curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -`
    - `sudo apt update`
    - `sudo apt install nodejs`
- NPM (installé avec NodeJS)
- une instance de [uptime-kuma](https://github.com/louislam/uptime-kuma) avec l'_A2F désactivée_ et les noms des sondes qui correspondent soit au nom des conteneurs, soit au nom des repositories (portainer-ce pour portainer/portainer-ce:latest)
- une instance de [Watchtower](https://github.com/containrrr/watchtower/) ou d'un autre service capable de mettre à jour les conteneurs automatiquement

## Installation

1. cloner le repo : `git clone https://github.com/GoingtohellYT/kuma-automatic-maintenances.git`
2. rendre les scripts shell exécutable : `chmod +x pre-script.sh` et `chmod +x post-script.sh`
3. installer les dépendances des modules NodeJS avec `npm install`
4. s'assurer que Watchtower est exécuté à des heures précises avec la syntaxe cron (par exemple "30 0 12,0 * * *" pour tous les jours à 12h 00min 30s et 00h 00min 30s)
5. ajouter les horaires d'exécution des scripts dans le crontab (le pre-script avant Watchtower et le post-script après -> par exemple "0 12,0 * * *" et "1 12,0 * * *")
    1. éditer le crontab
       `crontab -e`
    2. ajouter les tâches à la fin du fichier
       `[HORAIRE AVEC SYNTAXE CRON] [CHEMIN/VERS/pre-script.sh]`
       `[HORAIRE AVEC SYNTAXE CRON] [CHEMIN/VERS/post-script.sh]`
    3. enregistrer et quitter
6. insérer votre **login** et votre **password** dans le fichier _settings.json_
7. préciser si le nom des sondes dans _uptime-kuma_ correspond au noms des conteneurs ou à leur repository dans le fichier _settings.json_
8. insérer l'**url** devotre instance _uptime-kuma_ dans le fichier _settings.json_

## Réglages et variables d'environnement

Tous les réglages et autres variables d'environnement sont définis dans le fichier _settings.json_.

| Réglage | Action | Valeurs possibles |
|----------|----------|----------|
| probe-type | défini si le nom des somdes _uptime-kuma_ correspond au noms des conteneurs ou à leur repository | _"repo"_ pour repository et _"name"_ pour le nom |
| max-update-delay | défini l'intervalle de temps maximale entre la création de la maintenance et sa suppression (en minutes) | n'importe quel nombre entier supérieur à 0 |
| max-logs-size | défini la taille maximale du fichier des logs (en Mo) -> quand cette taille est dépassée, les logs sont supprimés | n'importe quelle nombre entier ou décimal positif (0 supprime les logs à chaque exécution) |
| log-level | défini le niveau de logs voulu | - "info" pour tous les logs (aucune maintenance supprimée/créée, maintenance supprimée/créée, suppression des logs, erreurs) |
|           |                         | - "low" pour quand une maintenance est créée/supprimée et les erreurs |
|           |                         | - "error" pour les erreurs seulement |
|           |                         | - "none" pour aucun log (max-logs-size devient alors inutile) |
|            |                                           |
| containers | défini lesconteneurs non pris en compte | liste des conteneurs exclus. Pour ajouter une valeur, mettre une virgule à la fin et ajouter une partie de l'image entre guillemets (Attention !! Mettre le **registre** excluera tous les conteneurs dont l'image provient de ce **registre**, il en va de même pour le **namespace** et le **tag** ! Pour exclure un seul conteneur, utiliser son **repository**.) |
|            |                                           |
| login | défini l'identifiant utilisé pour accéder à uptime-kuma | votre identifiant sous forme de chaîne de caractères |
| password | défini le mot de passe utilisé pour accéder à uptime-kuma | votre mot de passe sous forme de chaîne de caractères |
| url | défini l'url utilisée pour accéder à uptime-kuma | l'url de votre instance sous forme de chaîne de caractère |

## Limitations

A l'heure actuelle, ce programme se limite aux conteneurs dont l'image est disponible sur le **Docker Hub**. Tous les conteneurs provenant d'autres registres doivent être ajoutés à la **liste d'exceptions**.

Ce programme ne peut vérifier le besoin de mise à jour seulement sur **la machine sur laquelle il est installé**. Si vous avez plusieurs machines, il vous faut **une instance par machine**.

## Notes

Vous verrez une erreur à la première exécution. Cela est parfaitement normal et est dû au fait que le fichier des logs n'existe pas encore. Ce dernier sera créé à ce moment là. Si vous souhaitez ne pas voir cette erreur apparaître, vous pouvez créer vous-même le fichier avant la première exécution avec la commande `touch logs.txt`.
