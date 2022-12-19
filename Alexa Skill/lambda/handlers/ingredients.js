const Alexa = require('ask-sdk-core');
const axios = require("axios");
const AWS = require("aws-sdk");
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');
const { State, respondWithCocktailSuggestionCard, respondWithError, formatIngredientsArrayForSearch, getListOfIngredientsAsSpeakableString } = require("../index.js");


const CocktailsWithIngredientsIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
            && Alexa.getIntentName(handlerInput.requestEnvelope) === "CocktailWithIngredientsIntent"
    },
    async handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        // state is set
        attributes.state = State.WithIngredients;
        // state is saved
        handlerInput.attributesManager.setSessionAttributes(attributes);        
                
        return handlerInput.responseBuilder
            .speak("What do you want in your cocktail?")
            .reprompt("What should the cocktail contain?")
            .getResponse();
    }
}

const IngredientIntentHandler = {
    canHandle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        return Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
            && Alexa.getIntentName(handlerInput.requestEnvelope) === "IngredientIntent"
            && attributes["state"] === State.WithIngredients
    },
    handle(handlerInput) {
                
        const slots = handlerInput.requestEnvelope.request.intent.slots;
        
        var ingredientsQuery;
        try {
            ingredientsQuery = slots["ingredient"].slotValue.value;
        } catch (error) {
            return  handlerInput.responseBuilder
                .speak("I couldn't find " + slots["ingredient"].value + ". Sorry. What else do you want to add to your cocktail?")
                .reprompt("What else should the cocktail contain?")
                .getResponse();
        }
                
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        
        // convert spoken ingredients to array of unique ingredients
        const newIngredientsList = [...new Set(ingredientsQuery.split(" and ").map(ingredient => ingredient.trim()))]
        var successfulSpeakOutputPrefix = ""
        
        if (attributes.ingredients === undefined) {
            attributes.ingredients = newIngredientsList
        } else {
            for (let i = 0; i < newIngredientsList.length; i++) {
                if (attributes.ingredients.includes(newIngredientsList[i])) {
                    successfulSpeakOutputPrefix += "You already added " + newIngredientsList[i] + ". ";
                    newIngredientsList.splice(i, 1);
                    i--;
                }            
            }
            
            attributes.ingredients.push(...newIngredientsList)
        } 
        
        handlerInput.attributesManager.setSessionAttributes(attributes);        
                
        return handlerInput.responseBuilder
            .speak(successfulSpeakOutputPrefix + "I added " + newIngredientsList.join(" and ") + ". What else do you want in your cocktail?")
            .reprompt("What else should the cocktail contain?")
            .getResponse();
    }
}

// do part of do-while
const NoMoreIngredientsHandler = {
    canHandle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        return Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.NoIntent"
                || Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZOM.StopIntent"
                || Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.CancelIntent")
            && attributes["state"] === State.WithIngredients
    },
    async handle(handlerInput) {
        
        const attributes = handlerInput.attributesManager.getSessionAttributes()
        attributes.state = State.Default
        handlerInput.attributesManager.setSessionAttributes(attributes)
        
        if (attributes.ingredients === undefined || attributes.ingredients === []) {
            return handlerInput.responseBuilder
                .speak("You added no ingredients to your cocktail. You can ask me to make a cocktail by ingredient again, if you're still looking for a cocktail.")
                .reprompt("What can I do for you? If you're not sure what else I can do for you just ask me for help.")
                .getResponse()
        }
        
        const searchByIngredientsOptions = {
          method: 'GET',
          url: 'http://cocktailapi.bean-studios.com/cocktailByIngredient',
          params: {
              ingredients: formatIngredientsArrayForSearch(attributes.ingredients),
              shouldContainAllIngredients: "1",
              limit: "20"
          }
        };
        
        const string = formatIngredientsArrayForSearch(attributes.ingredients)
        const tempIngredients = attributes.ingredients.splice(0)
        // pointer to ingredients are pointer //idk 
        attributes.ingredients = []
        handlerInput.attributesManager.setSessionAttributes(attributes)
        
        return axios.request(searchByIngredientsOptions).then(function (searchByIngredientsResponse) {
        	
        	if (searchByIngredientsResponse.data === []) {
        	    return handlerInput.responseBuilder
            	    .speak("I couldn't find a cocktail with " + tempIngredients.join(" and ") + ". Sorry. What else can I do for you?")
            	    .reprompt("What can I do for you? If you're not sure what I can do for you just ask me for help.")
            	    .getResponse();
        	}
        	
        	// cache with ALL OF THEM SHMOLTAILS
        	attributes.cachedSuggestionsWithIngredients = searchByIngredientsResponse.data
        	handlerInput.attributesManager.setSessionAttributes(attributes)
        	
        	// extra
        	// randomizer
        	const randomSuggestionIndex = Math.floor(Math.random() * attributes.cachedSuggestionsWithIngredients.length) 
        	const chosenCocktail = attributes.cachedSuggestionsWithIngredients[randomSuggestionIndex]
        	
        	// shown cocktail is removed from cache
            attributes.cachedSuggestionsWithIngredients.splice(attributes.cachedSuggestionsWithIngredients.indexOf(attributes.cachedSuggestionsWithIngredients[randomSuggestionIndex]), 1)
            attributes.state = State.SuggestionShownWithIngredients
            handlerInput.attributesManager.setSessionAttributes(attributes)
            
            // details for card
            return respondWithCocktailSuggestionCard(handlerInput, chosenCocktail)
        	
        }).catch(function (error) {
        	
        	return handlerInput.responseBuilder
            	    .speak("I couldn't find a cocktail with " + tempIngredients.join(" and ") + ". Sorry. What else can I do for you?")
            	    .reprompt("What can I do for you? If you're not sure what I can do for you just ask me for help.")
            	    .getResponse();
        });
    }
}

// while part of do-while 
const anotherSuggestionWithIngredientsHandler = {
    canHandle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        return Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
            && Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.YesIntent"
            && attributes["state"] === State.SuggestionShownWithIngredients   
    },
    handle(handlerInput) {
        
        const attributes = handlerInput.attributesManager.getSessionAttributes()
        
        if (attributes.cachedSuggestionsWithIngredients.length === 0) {
            attributes.state = State.Default
            handlerInput.attributesManager.setSessionAttributes(attributes)
            return handlerInput.responseBuilder
        	    .speak("There are no more suggestions left and I couldn't find any more cocktails, I'm sorry. I can still read the instructions of the last cocktail or add it to your favorites. What else can I do for you?")
        	    .reprompt("What can I do for you? If you're not sure what I can do for you just ask me for help.")
        	    .getResponse();
        }
        
        const randomSuggestionIndex = Math.floor(Math.random() * attributes.cachedSuggestionsWithIngredients.length)
        const chosenCocktail = attributes.cachedSuggestionsWithIngredients[randomSuggestionIndex]
        
    	attributes.cachedSuggestionsWithIngredients.splice(attributes.cachedSuggestionsWithIngredients.indexOf(attributes.cachedSuggestionsWithIngredients[randomSuggestionIndex]), 1)
        handlerInput.attributesManager.setSessionAttributes(attributes)
        return respondWithCocktailSuggestionCard(handlerInput, chosenCocktail)
    }
};


exports.CocktailsWithIngredientsIntentHandler = CocktailsWithIngredientsIntentHandler;
exports.IngredientIntentHandler = IngredientIntentHandler;
exports.NoMoreIngredientsHandler = NoMoreIngredientsHandler;
exports.anotherSuggestionWithIngredientsHandler = anotherSuggestionWithIngredientsHandler;
