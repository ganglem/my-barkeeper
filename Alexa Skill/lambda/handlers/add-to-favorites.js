const Alexa = require('ask-sdk-core');
const axios = require("axios");
const AWS = require("aws-sdk");
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');
const { State, respondWithCocktailSuggestionCard, respondWithError, formatIngredientsArrayForSearch, getListOfIngredientsAsSpeakableString, formatNameForSearch, respondWithCocktailAddedToFavoritesCard } = require("../index.js");

const AddCocktailToFavoritesIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AddToFavoritesIntent'
    },
    async handle(handlerInput) {
        
        const userId = handlerInput.requestEnvelope.session.user.userId;
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const persistentAttributes = await attributesManager.getPersistentAttributes() || {};
        
        var speakOutput = ""
        
        //sessionAttributes.state = State.AddToFavorites;
        //attributesManager.setSessionAttributes(sessionAttributes);
        
        if (persistentAttributes.hasOwnProperty(userId) && persistentAttributes[userId].hasOwnProperty("lastCocktail")) {
            
            // Cocktail Information to save to favorites
            const newFavoriteCocktail = {
                    id: persistentAttributes[userId].lastCocktail.id,
                    name: persistentAttributes[userId].lastCocktail.name
                }
            
            // If the cocktail is already a favorite
            if (persistentAttributes[userId].hasOwnProperty("favoriteCocktails") && persistentAttributes[userId].favoriteCocktails.some(e => e.name === newFavoriteCocktail.name)) {
                speakOutput = "You already added \"" + newFavoriteCocktail.name + "\" to your favorites. What else can I do for you?";
                // if the user adds the cocktail to favorites while multiple suggestions are shown
                if (AreMultipleSuggestionsShown(sessionAttributes)) {
                    speakOutput = "You already added \"" + newFavoriteCocktail.name + "\" to your favorites. Do you want to see another one?"
                }
                if (alexaAskedToRead(sessionAttributes)) {
                    speakOutput = "You already added \"" + newFavoriteCocktail.name + "\" to your favorites. Do you want me to tell you how to make this cocktail?"
                }
                return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .reprompt("Tell me what else I can do for you. If you're not sure what I can do just ask me for help.")
                    .getResponse();
            }
            
            if (persistentAttributes[userId].hasOwnProperty("favoriteCocktails")) {
                persistentAttributes[userId].favoriteCocktails.push(newFavoriteCocktail);    
            } else {
                persistentAttributes[userId].favoriteCocktails = [newFavoriteCocktail];
            }
            
            attributesManager.setPersistentAttributes(persistentAttributes);
            await handlerInput.attributesManager.savePersistentAttributes();
            
            speakOutput = "I added your last cocktail \"" + persistentAttributes[userId].lastCocktail.name + "\" to your favorites. What else can I do for you?"
            if (AreMultipleSuggestionsShown(sessionAttributes)) {
                speakOutput = "I added your last cocktail \"" + persistentAttributes[userId].lastCocktail.name + "\" to your favorites. Do you want to see another one?"     
            }
            if (alexaAskedToRead(sessionAttributes)) {
                speakOutput = "I added your last cocktail \"" + persistentAttributes[userId].lastCocktail.name + "\" to your favorites. Do you want me to tell you how to make this cocktail?"
            }
            
            return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .reprompt("What can I do for you? If you're not sure what I can do for you just ask me for help.")
                    .getResponse();
        }
        
        speakOutput = "There is no cocktail that can be added to your favorites. Tell me what else I can do for you."
        if (AreMultipleSuggestionsShown(sessionAttributes)) {
            speakOutput = "There is no cocktail that can be added to your favorites. Do you want to see another one?"
        }
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt("What can I do for you? If you're not sure what I can do for you just ask me for help.")
            .getResponse();
    }
}

const AddCocktailToFavoritesByNameIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AddToFavoritesByNameIntent'
    },
    async handle(handlerInput) {
        
        const userId = handlerInput.requestEnvelope.session.user.userId;
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const persistentAttributes = await attributesManager.getPersistentAttributes() || {};
        
        sessionAttributes.state = State.ReadInstructions
        attributesManager.setSessionAttributes(sessionAttributes);
        
        if (!persistentAttributes.hasOwnProperty(userId)) {
            persistentAttributes[userId] = {};            
            attributesManager.setPersistentAttributes(persistentAttributes);
            await attributesManager.savePersistentAttributes();
        }
        
        const requestedCocktailName = handlerInput.requestEnvelope.request.intent.slots["cocktailName"].slotValue.value;
        
        const options = {
                method: 'GET',
                url: 'https://cocktailapi.bean-studios.com/cocktailByName',
                params: { name: formatNameForSearch(requestedCocktailName) }
            };
            
        // sending request gives response
        return axios.request(options).then(async function (response) {
            
            // if there is no match
            if (response.data == []) {
                return handlerInput.responseBuilder
                    .speak("I could not find a cocktail named \"" + requestedCocktailName + "\" . Sorry. What else can I do for you?")
                    .reprompt("What can I do for you? If you're not sure what I can do for you just ask me for help.")
                    .getResponse();
            }    
            
            // Cocktail Information to save to favorites
            const newFavoriteCocktail =  response.data[0]
            
            var speakOutput = ""
            
            // If the cocktail is already a favorite
            if (persistentAttributes[userId].hasOwnProperty("favoriteCocktails") && persistentAttributes[userId].favoriteCocktails.some(e => e.name === newFavoriteCocktail.name)) {
                speakOutput = "You already added \"" + newFavoriteCocktail.name + "\" to your favorites. Do you want me to tell you how to make this cocktail?"
                return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .reprompt("Tell me what else I can do for you. If you're not sure what I can do just ask me for help.")
                    .getResponse();
            }
            
            if (persistentAttributes[userId].hasOwnProperty("favoriteCocktails")) {
                persistentAttributes[userId].favoriteCocktails.push(newFavoriteCocktail);    
            } else {
                persistentAttributes[userId].favoriteCocktails = [newFavoriteCocktail];
            }
            
            attributesManager.setPersistentAttributes(persistentAttributes);
            await attributesManager.savePersistentAttributes();
                
            speakOutput = "I added \"" + newFavoriteCocktail.name + "\" to your favorites. Do you want me to tell you how to make this cocktail?"
                
            return respondWithCocktailAddedToFavoritesCard(handlerInput, newFavoriteCocktail, speakOutput);
	        
        }).catch(function (error) {
	        return handlerInput.responseBuilder
                    .speak("I could not find a cocktail named \"" + requestedCocktailName + "\" . Sorry. What else can I do for you?")
                    .reprompt("What can I do for you? If you're not sure what I can do for you just ask me for help.")
                    .getResponse();
        });
    }
}

function AreMultipleSuggestionsShown(sessionAttributes) {
    return sessionAttributes.state === State.SuggestionShownWithIngredients
    || sessionAttributes.state === State.RandomCocktail
    || sessionAttributes.state === State.ShowFavorites
    || sessionAttributes.state === State.CocktailByNameSuggestionShown
}

function alexaAskedToRead(sessionAttributes) {
    return sessionAttributes.state === State.ReadInstructions
}

exports.AddCocktailToFavoritesIntentHandler = AddCocktailToFavoritesIntentHandler;
exports.AddCocktailToFavoritesByNameIntentHandler = AddCocktailToFavoritesByNameIntentHandler  