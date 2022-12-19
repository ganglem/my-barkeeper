const Alexa = require('ask-sdk-core');
const axios = require("axios");
const AWS = require("aws-sdk");
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');

const State = {
  Default: "Default",
  RandomCocktail: "RandomCocktail",
  AddToFavorites: "AddToFavorites",
  AddToFavoritesByName: "AddToFavoritesByName",
  ShowFavorites: "ShowFavorites",
  ShowLast: "ShowLast",
  AddToShoppingList: "AddToShoppingList",
  ShowShoppingList: "ShowShoppingList",
  ClearShoppingList: "ClearShoppingList",
  WithIngredients: "WithIngredients",
  SuggestionShownWithIngredients: "SuggestionShownWithIngredients",
  ReadInstructions: "ReadInstructions",
  CocktailByName: "CocktailByName",
  CocktailByNameSuggestionShown: "CocktailByNameSuggestionShown"
};

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.state = State.Default;
        handlerInput.attributesManager.setSessionAttributes(attributes);
        
        const accessToken = handlerInput.requestEnvelope.context.System.user.accessToken
        
        var firstNameOfUser = ""
        
        // if the user has connected their amazon account to the skill, the barkeeper will greet them with tehir full name
        if (accessToken !== undefined) {
             
            // Request for getting the users profile information 
            const profileOptions = {
                method: "GET",
                url: "https://api.amazon.com/user/profile",
                headers: {
                    "Authorization": "bearer " + accessToken,
                }
            }
            
            // Get the users full name from amazons api
            firstNameOfUser = await axios.request(profileOptions).then(function (profileResponse) {
                return profileResponse.data.name.split(" ")[0];
            }).catch(function (error) {
                return ""
            });
        }
        
        const speakOutput = "Hi " + (firstNameOfUser !== "" ? firstNameOfUser + ", nice to see you again." : ",") + " I will be your barkeeper today. If you're not sure what I can do, just ask for my help. What can I do for you?";

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

async function persistLastCocktailToDatabase(handlerInput, cocktail) {
    const userId = handlerInput.requestEnvelope.session.user.userId
    var attributes = await handlerInput.attributesManager.getPersistentAttributes() || {};
    if (attributes.hasOwnProperty(userId)) {
        var userAttribues = attributes[userId]
        userAttribues.lastCocktail = cocktail
        attributes[userId] = userAttribues
    } else {
        attributes[userId] = {
            lastCocktail: cocktail 
        };
    }
    handlerInput.attributesManager.setPersistentAttributes(attributes);
    await handlerInput.attributesManager.savePersistentAttributes();
}

function formatIngredientsArrayForSearch(ingredients) {
    return ingredients.join(",").replace(new RegExp(" ", "g"), "_")
}

function formatNameForSearch(name) {
    return name.replace(new RegExp(" ", "g"), "_")
}


function getListOfIngredientsAsSpeakableString(ingredients) {
    var ingredientsString = "" + ingredients[0];
    for (let i = 1; i < ingredients.length; i++) {
        if (i === ingredients.length - 1) ingredientsString += " and " + ingredients[i];
        else ingredientsString += ", " + ingredients[i];
    }
    return ingredientsString;
}

function speakOutputWithDifferentVoice(textToSpeech) {
    return "<voice name=\"Matthew\"><amazon:domain name=\"conversational\">" + textToSpeech + "</amazon:domain></voice>";
}

function respondWithCocktailCard(handlerInput, cocktail) {
    persistLastCocktailToDatabase(handlerInput, cocktail);
    if (cocktail.instructionsEN === "") {
        cocktail.instructionsEN = cocktail.instructionsDE || "There are no instructions on how to make this cocktail."
    }
    return handlerInput.responseBuilder
                .speak(cocktail.name.replace("/</g", "(").replace("/>/g", ")") + ".<break time='1s'/> What else can I do for you?")
                .withStandardCard(
                    cocktail.name,
                    "Ingredients:\n" + getIngredientsListAsString(cocktail) + "\n \nInstructions:\n" + cocktail.instructionsEN.replace("/\n/g", "\n \n"),
                    cocktail.image,
                    cocktail.image)
                .reprompt("What can I do for you? If you're not sure what I can do, just ask me for help.")
                .getResponse();
}

function respondWithLastCocktailCard(handlerInput, cocktail) {
    persistLastCocktailToDatabase(handlerInput, cocktail);
    if (cocktail.instructionsEN === "") {
        cocktail.instructionsEN = cocktail.instructionsDE || "There are no instructions on how to make this cocktail."
    }
    return handlerInput.responseBuilder
                .speak("Your last cocktail was a " + cocktail.name.replace("/</g", "(").replace("/>/g", ")") + ".<break time='1s'/> Do you want me to read the instructions?")
                .withStandardCard(
                    cocktail.name,
                    "Ingredients:\n" + getIngredientsListAsString(cocktail) + "\n \nInstructions:\n" + cocktail.instructionsEN.replace("/\n/g", "\n \n"),
                    cocktail.image,
                    cocktail.image)
                .reprompt("Do you want me to read the instructions?")
                .getResponse();
}

function respondWithFavoriteCocktailCard(handlerInput, cocktail) {
    persistLastCocktailToDatabase(handlerInput, cocktail);
    if (cocktail.instructionsEN === "") {
        cocktail.instructionsEN = cocktail.instructionsDE || "There are no instructions on how to make this cocktail."
    }
    const cocktailName = cocktail.name.replace("/</g", "(").replace("/>/g", ")")
    const possibleIntroductions = [
        "Here is one of your favorite cocktails: " + cocktailName,
        "You should revisit the " + cocktailName,
        cocktailName,
        "What about " + cocktailName
    ]
    return handlerInput.responseBuilder
                .speak(possibleIntroductions[Math.floor(Math.random() * possibleIntroductions.length)] + ".<break time='1s'/> Do you want to see the next one?")
                .withStandardCard(
                    cocktail.name,
                    "Ingredients:\n" + getIngredientsListAsString(cocktail) + "\n \nInstructions:\n" + cocktail.instructionsEN.replace("/\n/g", "\n \n"),
                    cocktail.image,
                    cocktail.image)
                .reprompt("Do you want to see the next one?")
                .getResponse();
}

function respondWithCocktailSuggestionCard(handlerInput, cocktail, byName = false) {
    persistLastCocktailToDatabase(handlerInput, cocktail);
    if (cocktail.instructionsEN === "") {
        cocktail.instructionsEN = cocktail.instructionsDE || "There are no instructions on how to make this cocktail."
    }
    return handlerInput.responseBuilder
                .speak((byName ? "I found a " : "You should try a ") + cocktail.name.replace("/</g", "(").replace("/>/g", ")") + ".<break time='1s'/> Do you want to see the next one?")
                .withStandardCard(
                    cocktail.name,
                    "Ingredients:\n" + getIngredientsListAsString(cocktail) + "\n \nInstructions:\n" + cocktail.instructionsEN.replace("/\n/g", "\n \n"),
                    cocktail.image,
                    cocktail.image)
                .reprompt("Do you want to see another cocktail? ")
                .getResponse();
}

function respondWithCocktailAddedToFavoritesCard(handlerInput, cocktail, speakOutput) {
    persistLastCocktailToDatabase(handlerInput, cocktail);
    if (cocktail.instructionsEN === "") {
        cocktail.instructionsEN = cocktail.instructionsDE || "There are no instructions on how to make this cocktail."
    }
    return handlerInput.responseBuilder
                .speak(speakOutput)
                .withStandardCard(
                    cocktail.name,
                    "Ingredients:\n" + getIngredientsListAsString(cocktail) + "\n \nInstructions:\n" + cocktail.instructionsEN.replace("/\n/g", "\n \n"),
                    cocktail.image,
                    cocktail.image)
                .reprompt(speakOutput)
                .getResponse();
}

function respondWithError(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    attributes.state = State.Default;
    handlerInput.attributesManager.setSessionAttributes(attributes);
    return handlerInput.responseBuilder
	            .speak("Something went wrong, sorry. What else can I do for you?")
	            .reprompt("What can I do for you? If you're not sure what I can do, just ask me for help.")
	            .getResponse();
}

function getIngredientsListAsString(cocktail) {
    var ingredientsListString = "\n";
    const ingredients = JSON.parse(cocktail.ingredientsEN);
    ingredients.forEach((ingredient) => {
        ingredientsListString += "- ";
        if (ingredient["prefix"] !== undefined) {
            ingredientsListString += ingredient["prefix"].trim() + " ";
        }  
        ingredientsListString += ingredient["name"];
        if (ingredient["postfix"] !== undefined) {
            ingredientsListString += " " + ingredient["postfix"].trim();
        }
        ingredientsListString += "\n";
    });
    ingredientsListString = ingredientsListString.slice(0, -1);
    return ingredientsListString;
}


// END OUR STUFF
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = "I'll be your barkeeper today. My job is to suggest amazing cocktails to you! " + 
        "I can pick a random cocktail or you can tell me which ingredients the cocktail should contain and I'll try to find a suitable one. " + 
        "If you can't remember the last cocktail I suggested (because you had one too many), no worries, I can recall. " + 
        "I can also show you all of your favorite cocktails and you can add new ones or remove old ones. " + 
        "Either way, I can tell you how to make that cocktail. " + 
        "And if you feel like you need to be treated like a regular customer, you can connect your amazon account to this skill, so I can call you by your name. " +
        "Have fun and drink responsibly!";

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt("What else can I do for you?")
            .getResponse();
    }
};



const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.NoIntent")
            && attributes.state !== State.WithIngredients
            && attributes.state !== State.ShowFavorites
            && attributes.state !== State.RandomCocktail
            && attributes.state !== State.ReadInstructionQuestion
            && (attributes.state === State.ReadInstructions
                || attributes.state === State.SuggestionShownWithIngredients
                || attributes.state === State.CocktailByNameSuggestionShown
                || attributes.state === State.Default
                || attributes.state === State.ShowLast
                || attributes.state === State.AddToFavorites);
    },
    handle(handlerInput) {
        
        const attributes = handlerInput.attributesManager.getSessionAttributes()
        attributes.state = State.Default
        handlerInput.attributesManager.setSessionAttributes(attributes)
        
        const speakOutput = "You can call me anytime if you need something else.";

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent'
            || Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.YesIntent");
    },
    handle(handlerInput) {
        
        const currentState = handlerInput.attributesManager.getSessionAttributes()["state"];
        
        var speakOutput = 'You\'re still in the skill. Try again without invoking my barkeeper. If you\'re not sure what I can do, just ask me for help.';

        if (currentState === State.WithIngredients) {
           speakOutput = "I don't know about that. Say " + speakOutputWithDifferentVoice("Add") + " before you start listing your ingredients. Please try again."; 
        } else if   (currentState === State.ShowFavorites 
                        || currentState === State.SuggestionShownWithIngredients 
                        || currentState === State.CocktailByNameSuggestionShown 
                        || currentState === State.ReadInstructions
                    ) {
            speakOutput = "I don't know about that. Please say " + speakOutputWithDifferentVoice("Yes") + " or " + speakOutputWithDifferentVoice("No") + ". Do you want to see the next one?"
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt("If you\'re not sure what I can do, just ask me for help.")
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
/*const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};*/

/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'There was a problem and the current session will be closed.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

exports.State = State;
exports.respondWithCocktailSuggestionCard = respondWithCocktailSuggestionCard;
exports.respondWithError = respondWithError;
exports.formatIngredientsArrayForSearch = formatIngredientsArrayForSearch;
exports.formatNameForSearch = formatNameForSearch;
exports.getListOfIngredientsAsSpeakableString = getListOfIngredientsAsSpeakableString;
exports.respondWithCocktailCard = respondWithCocktailCard;
exports.respondWithLastCocktailCard = respondWithLastCocktailCard;
exports.respondWithCocktailAddedToFavoritesCard = respondWithCocktailAddedToFavoritesCard;
exports.speakOutputWithDifferentVoice = speakOutputWithDifferentVoice;
exports.respondWithFavoriteCocktailCard = respondWithFavoriteCocktailCard;
exports.persistLastCocktailToDatabase = persistLastCocktailToDatabase;

const { RandomCocktailIntentHandler } = require("./handlers/random-cocktail.js");
const { MakeCocktailIntentHandler } = require("./handlers/make-cocktail.js");
const { LastCocktailIntentHandler } = require("./handlers/last-cocktail.js");
const { CocktailsWithIngredientsIntentHandler, IngredientIntentHandler, NoMoreIngredientsHandler, anotherSuggestionWithIngredientsHandler} = require("./handlers/ingredients.js");
const { AddCocktailToFavoritesIntentHandler, AddCocktailToFavoritesByNameIntentHandler } = require("./handlers/add-to-favorites.js");
const { RemoveCocktailFromFavoritesIntentHandler } = require("./handlers/remove-from-favorites.js");
const { ShowFavoritesIntentHandler } = require("./handlers/show-favorites.js");
const { ReadInstructionsIntentHandler, ReadInstructionQuestionIntentHandler } = require("./handlers/read-instructions.js");
const { CocktailByNameIntentHandler, anotherCocktailByNameHandler } = require("./handlers/cocktail-by-name.js");
const { AddToShoppingListIntentHandler } = require("./handlers/add-to-shopping-list.js");

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        MakeCocktailIntentHandler,
        RandomCocktailIntentHandler,
        LastCocktailIntentHandler,
        CocktailsWithIngredientsIntentHandler,
        IngredientIntentHandler,
        NoMoreIngredientsHandler,
        anotherSuggestionWithIngredientsHandler,
        AddCocktailToFavoritesIntentHandler,
        AddCocktailToFavoritesByNameIntentHandler,
        RemoveCocktailFromFavoritesIntentHandler,
        ShowFavoritesIntentHandler,
        ReadInstructionsIntentHandler,
        ReadInstructionQuestionIntentHandler,
        CocktailByNameIntentHandler,
        anotherCocktailByNameHandler,
        AddToShoppingListIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        //IntentReflectorHandler
        )
    .addErrorHandlers(
        ErrorHandler)
    .withPersistenceAdapter(
        new ddbAdapter.DynamoDbPersistenceAdapter({
            tableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME,
            createTable: false,
            dynamoDBClient: new AWS.DynamoDB({apiVersion: 'latest', region: process.env.DYNAMODB_PERSISTENCE_REGION})
        })
    )
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();