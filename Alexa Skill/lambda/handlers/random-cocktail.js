const Alexa = require('ask-sdk-core');
const axios = require("axios");
const AWS = require("aws-sdk");
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');
const { State, respondWithCocktailSuggestionCard, respondWithError, formatIngredientsArrayForSearch, getListOfIngredientsAsSpeakableString } = require("../index.js");


const RandomCocktailIntentHandler = {
    canHandle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'RandomCocktail'
                || (Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.YesIntent"
                    && attributes.state === State.RandomCocktail));
    },
    async handle(handlerInput) {
        
        // bean is lazy and doesnt wanna type 
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        // random cocktail state is added to attributes
        attributes.state = State.RandomCocktail;
        
        // 8 isch halt so 
        // undefined, bc no cocktails are in cache
        // creates cocktail cache if no cache
        if (attributes.lastCocktailIndex === undefined || attributes.lastCocktailIndex > 8) {
        
            const options = {
                method: 'GET',
                url: 'http://cocktailapi.bean-studios.com/randomCocktails',
                params: {amount: "10"}
            };
            
            // sending request gives response
            return axios.request(options).then(function (response) {
                
                // 10 cocktail objects in a data structure like map/array/list whatever
                // drink is an OBJECT (JSon lmao) which is casted to a map
                // object in an object
                // objectception
                const randomCocktails = response.data;
            
                attributes.cachedRandomCocktails = randomCocktails; 
                // pointer
                attributes.lastCocktailIndex = 0;
                // attributes are saved AGAIN
                // chache and pointer are saved
                handlerInput.attributesManager.setSessionAttributes(attributes);
                
                return respondWithCocktailSuggestionCard(handlerInput, randomCocktails[attributes.lastCocktailIndex]);
    	        
            }).catch(function (error) {
                // http request fails
    	        return respondWithError(handlerInput);
            });
            
        } else {
            // pointer is increased if cache is still there
            attributes.lastCocktailIndex = attributes.lastCocktailIndex + 1;
            handlerInput.attributesManager.setSessionAttributes(attributes);
            
            return respondWithCocktailSuggestionCard(handlerInput, attributes.cachedRandomCocktails[attributes.lastCocktailIndex]);
        }
    }
};

exports.RandomCocktailIntentHandler = RandomCocktailIntentHandler;