const Alexa = require('ask-sdk-core');
const axios = require("axios");
const AWS = require("aws-sdk");
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');
const { State, respondWithCocktailSuggestionCard, respondWithCocktailCard, respondWithError, formatIngredientsArrayForSearch, getListOfIngredientsAsSpeakableString, formatNameForSearch } = require("../index.js");

const CocktailByNameIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CocktailByNameIntent'
    },
    async handle(handlerInput){

        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes();
    
        // cocktail by name state is added to attributes
        sessionAttributes.state = State.CocktailByName
        attributesManager.setSessionAttributes(sessionAttributes)
        
        const requestedCocktailName = handlerInput.requestEnvelope.request.intent.slots["cocktailName"].slotValue.value;
        
        const options = {
                method: 'GET',
                url: 'https://cocktailapi.bean-studios.com/cocktailByName',
                params: { name: formatNameForSearch(requestedCocktailName) }
            };
        
        // sending request gives response
        return axios.request(options).then(function (response) {
            
            if (JSON.stringify(response.data) === "[]") {
                return handlerInput.responseBuilder
                    .speak("I could not find a cocktail named \"" + requestedCocktailName + "\". Sorry. What else can I do for you?")
                    .reprompt("What can I do for you? If you're not sure what I can do for you just ask me for help.")
                    .getResponse();
            }
            
            // cache all found cocktail names
        	sessionAttributes.cachedSuggestionCocktails = response.data
        	handlerInput.attributesManager.setSessionAttributes(sessionAttributes)
        	
        	const chosenCocktail = sessionAttributes.cachedSuggestionCocktails[0]
        	
        	// shown cocktail is removed from cache
            sessionAttributes.cachedSuggestionCocktails.splice(0, 1)
            sessionAttributes.state = State.CocktailByNameSuggestionShown
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes)
            
            return respondWithCocktailSuggestionCard(handlerInput, chosenCocktail, true);
	        
        }).catch(function (error) {
            // http request fails
	        return respondWithError(handlerInput);
        });
    }
}; 

const anotherCocktailByNameHandler = {
    canHandle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        return Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
            && Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.YesIntent"
            && attributes["state"] === State.CocktailByNameSuggestionShown   
    },
    handle(handlerInput) {
        
        const attributes = handlerInput.attributesManager.getSessionAttributes()
        
        if (attributes.cachedSuggestionCocktails.length === 0) {
            attributes.state = State.Default
            handlerInput.attributesManager.setSessionAttributes(attributes)
            return handlerInput.responseBuilder
        	    .speak("There are no more suggestions left and I couldn't find any more cocktails, I'm sorry. I can still read the instructions of the last cocktail or add it to your favorites. What else can I do for you?")
        	    .reprompt("What can I do for you? If you're not sure what I can do for you just ask me for help.")
        	    .getResponse();
        }
        
        const chosenCocktail = attributes.cachedSuggestionCocktails[0]
        
    	attributes.cachedSuggestionCocktails.splice(0, 1)
        handlerInput.attributesManager.setSessionAttributes(attributes)
        return respondWithCocktailSuggestionCard(handlerInput, chosenCocktail, true)
    }
};

exports.CocktailByNameIntentHandler = CocktailByNameIntentHandler;
exports.anotherCocktailByNameHandler = anotherCocktailByNameHandler;