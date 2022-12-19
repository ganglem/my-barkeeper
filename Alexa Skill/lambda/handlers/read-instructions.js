const Alexa = require('ask-sdk-core');
const axios = require("axios");
const AWS = require("aws-sdk");
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');
const { State, respondWithCocktailSuggestionCard, respondWithError, formatIngredientsArrayForSearch, getListOfIngredientsAsSpeakableString, formatNameForSearch, persistLastCocktailToDatabase } = require("../index.js");

/**state is set*/
const ReadInstructionQuestionIntentHandler = {

    canHandle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.NoIntent")
            && (attributes.state === State.RandomCocktail
                || attributes.state === State.ReadInstructionQuestion
                || attributes.state === State.ShowLast
                || attributes.state === State.SuggestionShownWithIngredients
                || attributes.state === State.ShowFavorites
                || attributes.state === State.CocktailByNameSuggestionShown);
    },
    async handle(handlerInput) {
        const userId = handlerInput.requestEnvelope.session.user.userId
        const attributesManager = handlerInput.attributesManager;
        const attributes = attributesManager.getSessionAttributes();
        const persAttributes = await attributesManager.getPersistentAttributes();
        
        // STATE IS SET HERE
        attributes.state = State.ReadInstructions;
        attributesManager.setSessionAttributes(attributes);

        return handlerInput.responseBuilder
            .speak("Do you want me to tell you how to make this cocktail?")
            .reprompt("Do you want me to read the instructions on how to make a " + persAttributes[userId].lastCocktail.name + "?")
            .getResponse();
    }
}

const ReadInstructionsIntentHandler = {

    canHandle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === "ReadInstructionsIntent"
            || attributes.state === State.ReadInstructions
            && Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.YesIntent")
    },
    async handle(handlerInput) {

        // bean is lazy and doesnt wanna type
        const userId = handlerInput.requestEnvelope.session.user.userId
        const attributesManager = handlerInput.attributesManager;
        const attributes = await handlerInput.attributesManager.getPersistentAttributes() || {};

        attributes.state = State.ReadInstructions;
        attributesManager.setSessionAttributes(attributes);

        // Only take the slot value if the intent is the read instructions intent. The yes intent does not have a slot
        var cocktailnameSlot = {};
        if (Alexa.getIntentName(handlerInput.requestEnvelope) !== "AMAZON.YesIntent") {
            cocktailnameSlot = handlerInput.requestEnvelope.request.intent.slots["cocktailName"];
        }
        var cocktailName = ""
        var cocktailInstructions = "";
        
        // if the user named a specific cocktail by name
        if (cocktailnameSlot.hasOwnProperty("slotValue") && cocktailnameSlot.slotValue.value !== "last cocktail" && cocktailnameSlot.slotValue.value !== "this cocktail") {
          
            cocktailName = cocktailnameSlot.slotValue.value;
            // allows: "how do i make -> a <- tequila sunrise"
            if (cocktailName.charAt(0) === "a" && cocktailName.charAt(1) === " ") {
                cocktailName = cocktailName.slice(2);
            }
            const cocktail = await getCocktailByName(handlerInput, cocktailName);
            if (cocktail === undefined) {
                attributes.state = State.Default;
                attributesManager.setSessionAttributes(attributes);
                return handlerInput.responseBuilder
                    .speak("I could not find a cocktail named \"" + cocktailName + "\". Sorry. What else can I do for you?")
                    .reprompt("What else can I do for you?")
                    .getResponse();
            }
            // persist cocktail as last cocktail to database if the cocktail was successfully retreived from the api 
            await persistLastCocktailToDatabase(handlerInput, cocktail);
            cocktailName = cocktail.name;
            cocktailInstructions = cocktail.instructionsEN || "There are no instructions for this cocktail" // if getting the cocktail was not successfull, it will be handled the same as if there weren't any instructions
        // if the user wants the instructions from the last cocktail     
        } else {
            
            // If there is no last cocktail
            if (!attributes.hasOwnProperty(userId) || !attributes[userId].hasOwnProperty("lastCocktail")) {
                attributes.state = State.Default;
                attributesManager.setSessionAttributes(attributes);
                return handlerInput.responseBuilder
                    .speak("It looks like I can't remember the last cocktail. I'm sorry. What can I do for you?")
                    .reprompt("What can I do for you? If you're not sure what I can do for you just ask me for help.")
                    .getResponse();
            }
            
            cocktailName = attributes[userId].lastCocktail.name;
            cocktailInstructions = attributes[userId].lastCocktail.instructionsEN;
            
            if (cocktailInstructions === "") {
                cocktailInstructions = attributes[userId].lastCocktail.instructionsDE || "There are no instructions for this cocktail."
            }
        } 
        
        // Preparing instructions that they can be read
        cocktailInstructions = cocktailInstructions.replace(new RegExp("&", "g"), "and")
        var cocktailNamePrefix = ""
        if (Alexa.getIntentName(handlerInput.requestEnvelope) === "ReadInstructionsIntent") {
            cocktailNamePrefix = "Here are the instructions for the \"" + cocktailName +  "\". <break time='1s'/>"
        }
        
        return handlerInput.responseBuilder
            .speak(cocktailNamePrefix + cocktailInstructions + ".<break time='1s'/> Do you want me to read it again?")
            .reprompt("Do you want me to read the instructions again?")
            .getResponse();
    }
}

// returns the first mathcing cocktail from the api by name
async function getCocktailByName(handlerInput, cocktailName) {
        
        const options = {
            method: 'GET',
            url: 'https://cocktailapi.bean-studios.com/cocktailByName',
            params: { name: formatNameForSearch(cocktailName) }
        };
        
        // sending request gives response
        return axios.request(options).then(function (response) {
            
            if (JSON.stringify(response.data) === "[]") {
                return undefined
            }
        	return response.data[0]
	        
        }).catch(function (error) {
            // http request fails
	        return undefined
        });
}

exports.ReadInstructionQuestionIntentHandler = ReadInstructionQuestionIntentHandler;
exports.ReadInstructionsIntentHandler = ReadInstructionsIntentHandler;