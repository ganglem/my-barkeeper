const Alexa = require('ask-sdk-core');
const axios = require("axios");
const AWS = require("aws-sdk");
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');
const { State, respondWithCocktailSuggestionCard, respondWithCocktailCard, respondWithError, formatIngredientsArrayForSearch, getListOfIngredientsAsSpeakableString } = require("../index.js");

const AddToShoppingListIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AddToShoppingListIntent'
    },
    async handle(handlerInput){

        // data for the list
        //const accessToken = handlerInput.requestEnvelope.context.System.apiAccessToken
        
        /*const options = {
                method: 'GET',
                url: 'https://api.eu.amazonalexa.com/v2/householdlists/',
                headers: {
                    "Authorization": accessToken
                }
            };*/
            
        
        
        const skillId = handlerInput.requestEnvelope.context.System.application.applicationId
        const accessToken = handlerInput.requestEnvelope.context.System.user.accessToken
        
        if (accessToken === undefined) {
            return handlerInput.responseBuilder
                .speak("You have to link your amazon account with this skill in order to have access to this feature")
                .withLinkAccountCard()
                .getResponse();
        }
        
        /*const options = {
                method: 'GET',
                url: "https://api.amazonalexa.com/v2/householdlists?access_token=" + accessToken
            };*/
        
        /*const options = {
            method: "GET",
            url: "https://api.amazon.com/v1/skills/amzn1.ask.skill.61c2a8ca-1d6b-48e6-80f0-22314af97f0c/credentials",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": accessToken
            }
        }*/
        
        const listOptions = {
            method: "POST",
            url: "https://api.amazon.com/auth/o2/token",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
            },
            data: {
                "grant_type": encodeURIComponent("client_credentials"),
                "client_id": encodeURIComponent("amzn1.application-oa2-client.5c09947b7beb44bd80f14cf964ba8334"),
                "client_secret": encodeURIComponent("0dce026cd758711938f82a44cb6ee02dcce3f50b7fffb930105e7f2ac099ce46"),
                "scope": encodeURIComponent("alexa:skill_messaging")
            }
        }
        
        return axios.request(listOptions).then(function (listResponse) {
            
            return handlerInput.responseBuilder
            .speak(JSON.stringify(listResponse.data))
            .reprompt("What should the cocktail contain?")
            .getResponse();
        }).catch(function (error) {
            // http request fails
            return handlerInput.responseBuilder
            .speak(handlerInput.requestEnvelope.context.System.apiAccessToken + " " + skillId + " " + error.message)
            .reprompt("What should the cocktail contain?")
            .getResponse();
    	   return respondWithError(handlerInput);
        });
        
        
        
        
        
        
        /*const verifyOptions = {
                method: 'GET',
                url: 'https://api.amazon.com/auth/o2/tokeninfo?access_token=' + accessToken,
            };*/
            
        // sending request gives response
        
        /*return axios.request(verifyOptions).then(function (verifyResponse) {
            
            const listOptions = {
                method: "GET",
                url: "https://api.amazonalexa.com/v2/householdlists/",
                headers: {
                    "Authorization": "Bearer " + accessToken,
                    "Content-Type": "json"
                }
            }
            
            return axios.request(listOptions).then(function (listResponse) {
            
                return handlerInput.responseBuilder
                .speak(JSON.stringify(listResponse.data))
                .reprompt("What should the cocktail contain?")
                .getResponse();
            }).catch(function (error) {
                // http request fails
                return handlerInput.responseBuilder
                .speak(handlerInput.requestEnvelope.context.System.apiAccessToken + " " + skillId + " " + error.message)
                .reprompt("What should the cocktail contain?")
                .getResponse();
        	   return respondWithError(handlerInput);
            });
            
        }).catch(function (error) {
            // http request fails
            return handlerInput.responseBuilder
            .speak(handlerInput.requestEnvelope.context.System.apiAccessToken + " " + skillId + " " + error.message)
            .reprompt("What should the cocktail contain?")
            .getResponse();
    	   return respondWithError(handlerInput);
        });*/
        
        
        const listClient = handlerInput.serviceClientFactory.getListManagementServiceClient();
        const addRequest = {
            value: "test",
            status: "active"
        };
        //listClient.createListItem(shoppinglistId, addRequest);

        return handlerInput.responseBuilder
            .speak(accessToken)
            .reprompt("What should the cocktail contain?")
            .getResponse();

        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes();
    }
}; 

exports.AddToShoppingListIntentHandler = AddToShoppingListIntentHandler;