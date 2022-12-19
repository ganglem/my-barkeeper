<?php

use App\Http\Controllers\Web\HomeController;
use App\Http\Controllers\Web\JsonController;
use App\Http\Controllers\Web\CocktailController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get("/", [HomeController::class, "index"])->name("welcome");
Route::get("/bean", [JsonController::class, "bean"]);
Route::get("/add", [JsonController::class, "add"]);
Route::get("/allIngredients", [CocktailController::class, "getAllIngredients"]);
Route::get("/randomCocktails", [CocktailController::class, "getRandomCocktails"]);
Route::get("/cocktailByIngredient", [CocktailController::class, "getCocktailByIngredient"]);
Route::get("/cocktailByName", [CocktailController::class, "getCocktailByName"]);
