#!/usr/bin/env python
import logging

from datetime import datetime

import requests
import json

logger = logging.getLogger()
logger.setLevel("INFO")


def lambda_handler(event, context):
    """
    This function fetches NBA games from ESPN API and processes the data to extract top stats for
    each game.
    :param event:
    :param context:
    :return:
    """

    logger.info({'event': event})
    logger.info({'context': context})

    espn_api_endpoint = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard'
    espn_response = requests.get(espn_api_endpoint)
    logger.info({'espn_response': espn_response})

    if espn_response.status_code == 200:
        data = espn_response.json()
        processed_games = process_games(data)
        logger.info({'processed_games': processed_games})
        return {
            'statusCode': 200,
            'body': json.dumps(processed_games)
        }
    else:
        logger.error({'error': espn_response.text})
        return {
            'statusCode': 500,
            'body': 'Error fetching data from ESPN'
        }


def process_games(data):
    """
    This function processes the ESPN API response to extract top stats for each game.
    :param data:
    :return:
    """
    games = [
        {
            'date': datetime.strptime(event['date'],
                                      "%Y-%m-%dT%H:%MZ").strftime("%B %d, %Y, %H:%M"),
            'teams': event['name'],
            'stats': [
                {
                    'team': competitor['team']['displayName'],
                    'top_scorer': leader['leaders'][0]['athlete']['displayName'],
                    'points': leader['leaders'][0]['displayValue'] + ' ' +
                    leader['shortDisplayName']
                    if leader['name'] == 'pointsPerGame'
                    else leader['leaders'][0]['displayValue'] + ' total',
                    'score': competitor['score']
                    if leader['name'] == 'points'
                    else 'Game has not started yet'
                }
                for competition in event['competitions']
                for competitor in competition['competitors']
                for leader in competitor.get('leaders')
                if leader['name'] in ['pointsPerGame', 'points']
            ]
        }
        for event in data.get('events', [])
    ]

    return games
