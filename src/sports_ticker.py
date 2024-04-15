"""
This function fetches NBA games from ESPN API and processes the data to extract top stats for
"""

import logging
import json

from datetime import datetime
import requests

logger = logging.getLogger()
logger.setLevel("INFO")


def lambda_handler(event, context):
    """
    This function fetches NBA games from ESPN API and processes the data to extract top stats for
    each game.
    :param event:
    :param context:
    :return: JSON response with top stats for each game
    """

    logger.info({'event': event})
    logger.info({'context': context})

    espn_api_endpoint = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard'
    espn_response = requests.get(espn_api_endpoint, timeout=30)
    logger.info({'espn_response': espn_response})

    if espn_response.status_code == 200:
        data = espn_response.json()
        return process_games(data)

    logger.error({'error': espn_response.text})
    return {
        'statusCode': 500,
        'body': 'Error fetching data from ESPN'
    }


def process_games(data):
    """
    This function processes the ESPN API response to extract top stats for each game.
    :param data: ESPN API response
    :return: JSON response with top stats for each game
    """
    games = []
    try:
        logger.info({'data': data})
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
                        'final_score': competitor['score']
                        if leader['name'] == 'points'
                        else 'Game has not started yet'
                    }
                    for competition in event['competitions']
                    for competitor in competition['competitors']
                    for leader in competitor.get('leaders')
                    if leader['name'] in ['pointsPerGame', 'points']
                ]
            }
            for event in data.get('events')
        ]
    except KeyError as error:
        logger.error({'error': error})
        payload = {
            'statusCode': 500,
            'body': 'Error processing data from ESPN'
        }
        logger.error({'payload': payload})
    payload = {
        'statusCode': 200,
        'body': json.dumps(games)
    }
    logger.info({'payload': payload})
    return payload
