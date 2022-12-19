const Alexa = require('ask-sdk-core');
const axios = require("axios");
const AWS = require("aws-sdk");
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');
const { State, respondWithCocktailSuggestionCard, respondWithCocktailCard, respondWithError, formatIngredientsArrayForSearch, getListOfIngredientsAsSpeakableString, respondWithLastCocktailCard } = require("../index.js");


const LastCocktailIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'LastCocktailIntent'
    },
    async handle(handlerInput){

        // bean is lazy and doesnt wanna type
        const userId = handlerInput.requestEnvelope.session.user.userId
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getPersistentAttributes();
        const persistentAttributes = await attributesManager.getPersistentAttributes() || {};
    
        // last cocktail state is added to attributes
        sessionAttributes.state = State.ReadInstructions
        attributesManager.setSessionAttributes(sessionAttributes)
    
        if (persistentAttributes.hasOwnProperty(userId) && persistentAttributes[userId].hasOwnProperty("lastCocktail")) {
            return respondWithLastCocktailCard(handlerInput, persistentAttributes[userId].lastCocktail)
        }
        
        return handlerInput.responseBuilder
            .speak("It looks like there is no previous cocktail. What else can I do for you?")
            .reprompt("What can I do for you? If you're not sure what I can do for you just ask me for help.")
            .getResponse();
    }
}; 

exports.LastCocktailIntentHandler = LastCocktailIntentHandler;
