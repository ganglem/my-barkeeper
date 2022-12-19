const Alexa = require('ask-sdk-core');
const axios = require("axios");
const AWS = require("aws-sdk");
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');
const { State, respondWithCocktailSuggestionCard, respondWithError, formatIngredientsArrayForSearch, getListOfIngredientsAsSpeakableString, speakOutputWithDifferentVoice } = require("../index.js");

/** 
 * works like help function for clueless people
*/
const MakeCocktailIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'MakeCocktailIntent'
    },
    handle(handlerInput) {
        
        return handlerInput.responseBuilder
            .speak("Are you looking for a random cocktail or a cocktail by ingredient? You can also ask me to search for a specific cocktail by saying " + 
                    speakOutputWithDifferentVoice("search for") + 
                    " followed by the cocktail's name.")
            .reprompt("Tell me if you want me to suggest you a random cocktail or if you're looking for a cocktail by ingredient.")
            .getResponse();
    }
}

exports.MakeCocktailIntentHandler = MakeCocktailIntentHandler;