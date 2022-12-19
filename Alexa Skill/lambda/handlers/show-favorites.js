const Alexa = require('ask-sdk-core');
const axios = require("axios");
const AWS = require("aws-sdk");
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');
const { State, respondWithCocktailSuggestionCard, respondWithCocktailCard, 
        respondWithError, formatIngredientsArrayForSearch, getListOfIngredientsAsSpeakableString, formatNameForSearch, respondWithFavoriteCocktailCard } = require("../index.js");

const ShowFavoritesIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ShowFavoritesIntent'
            || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
            && handlerInput.attributesManager.getSessionAttributes().state === State.ShowFavorites
    },
    async handle(handlerInput) {
        
        const userId = handlerInput.requestEnvelope.session.user.userId;
        const attributesManager = handlerInput.attributesManager;
        const persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes() || {};
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        if (!(persistentAttributes.hasOwnProperty(userId) && persistentAttributes[userId].hasOwnProperty("favoriteCocktails"))) {
            return handlerInput.responseBuilder
                .speak("You don't have any favorite cocktails yet. You can ask me to show you some cocktails.")
                .reprompt("What else can I do for you?")
                .getResponse();
        }
        
        if (sessionAttributes.currentFavoriteCocktailIndex === undefined || sessionAttributes.state != State.ShowFavorites) {
            sessionAttributes.currentFavoriteCocktailIndex = 0
        } else {
            sessionAttributes.currentFavoriteCocktailIndex += 1;    
        }
        
        sessionAttributes.state = State.ShowFavorites;
        
        attributesManager.setSessionAttributes(sessionAttributes);
        
        // Wenn alle Cocktails angezeigt
        if (sessionAttributes.currentFavoriteCocktailIndex >= persistentAttributes[userId].favoriteCocktails.length) {
            sessionAttributes.state = State.Default;
            attributesManager.setSessionAttributes(sessionAttributes);
            return handlerInput.responseBuilder
        	    .speak("There are no more cocktails. I can still read the instructions from the last cocktail. What else can I do for you?")
        	    .reprompt("What else can I do for you?")
        	    .getResponse();
        }
        
        const currentFavoriteCocktail = persistentAttributes[userId].favoriteCocktails[sessionAttributes.currentFavoriteCocktailIndex]; 
        
        // create https request for getting a cocktail by name from the cocktail api
        const options = {
            method: 'GET',
            url: 'https://cocktailapi.bean-studios.com/cocktailByName',
            params: { name: formatNameForSearch(currentFavoriteCocktail.name) }
        };
        
        // send request and handle response
        return axios.request(options).then(function (response) {
            
            try {
                // get the list of cocktails from the responses data
                const currentCocktail = response.data[0];
                
                attributesManager.setSessionAttributes(sessionAttributes);
                return respondWithFavoriteCocktailCard(handlerInput, currentCocktail);
	        } catch(error) {
	            return handlerInput.responseBuilder
        	    .speak("The cocktail you were looking for isn't available anymore. Apologies for the inconvenience.")
        	    .reprompt("What else can I do for you?")
        	    .getResponse();
	        }
	        
        }).catch(function (error) {
            // https request fails
	        return respondWithError(handlerInput);
        });
    }
}

exports.ShowFavoritesIntentHandler = ShowFavoritesIntentHandler;