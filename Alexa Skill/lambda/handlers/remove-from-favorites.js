const Alexa = require('ask-sdk-core');
const axios = require("axios");
const AWS = require("aws-sdk");
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');
const { State, respondWithCocktailSuggestionCard, respondWithError, formatIngredientsArrayForSearch, getListOfIngredientsAsSpeakableString, formatNameForSearch, respondWithCocktailAddedToFavoritesCard, speakOutputWithDifferentVoice } = require("../index.js");

const RemoveCocktailFromFavoritesIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RemoveFromFavoritesIntent'
    },
    async handle(handlerInput) {
    
        const userId = handlerInput.requestEnvelope.session.user.userId;
        const attributesManager = handlerInput.attributesManager;
        const persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes() || {};
        const sessionAttributes = attributesManager.getSessionAttributes();
    
        // If the user does not have any favorites
        if (!persistentAttributes[userId].hasOwnProperty("favoriteCocktails") || persistentAttributes[userId].favoriteCocktails.length === 0) {
            sessionAttributes.state = State.Default;
            attributesManager.setSessionAttributes(sessionAttributes);
            return handlerInput.responseBuilder
                .speak("I couldn't do that. You don't have any favorite cocktails. You can always add the last shown cocktail to your favorites by saying " + speakOutputWithDifferentVoice("add the last ccoktail to my favorites") + ", or " + 
                        "add one with it's name by saying " + speakOutputWithDifferentVoice("add the following cocktail to my favorites") + " followed by the cocktails name. What else can I do for you?")
                .reprompt("Whal else can I do for you?")
                .getResponse();
        }
    
        const cocktailnameSlot = handlerInput.requestEnvelope.request.intent.slots["cocktailName"];
        var speakOutput = ""
        
        // If the user named a specific cocktail
        if (cocktailnameSlot.hasOwnProperty("slotValue")) {
            const cocktailName = cocktailnameSlot.slotValue.value;
            
            // if the requested cocktail is not a favorite
            if (!isCocktailInList(cocktailName, persistentAttributes[userId].favoriteCocktails)) {
                speakOutput = "\"" + cocktailName + "\" is already not a part of your favorites. What else can I do for you?"
            
            // If the requested cocktail is a favorite    
            } else {
                removeCocktailFromFavorites(cocktailName, handlerInput, persistentAttributes, userId)
                
                const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
                sessionAttributes.currentFavoriteCocktailIndex = undefined;
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
                
                speakOutput = "I removed " + cocktailName + " from your favorites. What else can I do for you?";   
            }
        
        // if the user wants to remove the last shown favorite
        } else if (sessionAttributes.state === State.ShowFavorites) {
            const cocktailName = persistentAttributes[userId].lastCocktail.name
            await removeCocktailFromFavorites(cocktailName, handlerInput, persistentAttributes, userId)
            speakOutput = "I removed your last cocktail \"" + cocktailName + "\" from your favorites. Do you want to see the next one?";
        
        // if the user wanted to remove the last cocktail outside of "show favorites"    
        } else {
            speakOutput = "I don't know which cocktail to remove. Say \"(show me my favorites)\" to see all your favorite cocktails. There you can remove the current shown cocktail" + 
                            " by saying \"(remove this cocktail)\". You can also remove a cocktail from your favorites at any point if you know it's name. To do that" +  
                            " Just say \"(remove the following cocktail from my favorites)\" followed by the cocktail's name.";
        }
    
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt("Whal else can I do for you?")
            .getResponse();
    }
}

function isCocktailInList(cocktailName, listOfCocktails) {
    const filteredByNameList = listOfCocktails.filter(cocktail => cocktail.name.toUpperCase() === cocktailName.toUpperCase() )
    return filteredByNameList.length > 0
}

// Remove the cocktail with the cocktailName from the list of favorites and persist it to the database
async function removeCocktailFromFavorites(cocktailName, handlerInput, persistentAttributes, userId) {
    
    // Remove cocktail from favorites list
    const currentListOfFavorites = persistentAttributes[userId].favoriteCocktails;
    const newListOfFavorites = currentListOfFavorites.filter(cocktail => cocktail.name.toUpperCase() != cocktailName.toUpperCase() );
    persistentAttributes[userId].favoriteCocktails = newListOfFavorites
    
    // Subtract 1 from the counter of the favorite cocktails, so the next cocktail that is shown is really the next cocktail
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.currentFavoriteCocktailIndex -= 1;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    
    // persist updated favorites list to database 
    handlerInput.attributesManager.setPersistentAttributes(persistentAttributes);
    await handlerInput.attributesManager.savePersistentAttributes();
}

exports.RemoveCocktailFromFavoritesIntentHandler = RemoveCocktailFromFavoritesIntentHandler