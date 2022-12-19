<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use \Illuminate\Http\Request;

class CocktailController extends Controller {

    public function getRandomCocktails(Request $request) {

        $values = $request->all();
        $amountOfCocktails = intval($values["amount"] ?? 1);
        $randomCocktailQuery = "SELECT * FROM SharedCocktailDetails ORDER BY RAND() LIMIT $amountOfCocktails";
        $data = DB::select($randomCocktailQuery);

        return response(view("json.index", compact('data')),200, ['Content-Type' => 'application/json', 'Access-Control-Allow-Origin' => '*']);
    }

    public function getAllIngredients(Request $request) {

        $values = $request->all();
        $language = strval($values["language"] ?? "en");
        $allIngredientsQuery = "SELECT ingredients{$language} FROM SharedCocktailDetails";
        $allIngredients = DB::select($allIngredientsQuery);

        $ingredientsByLanguageProperty = "ingredients$language";
        $data = array_map(function ($ingredients) use ($ingredientsByLanguageProperty) {
            return array_map(function ($ingredient) {
                return strval($ingredient["name"]);
            }, json_decode($ingredients->$ingredientsByLanguageProperty, true) ?? []);
        }, $allIngredients);
        $data = array_merge(...$data);
        $data = array_unique($data);
        $data = array_filter($data, function($ingredient) {
           return $ingredient != "";
        });

        return response(view("json.index", compact('data')),200, ['Content-Type' => 'application/json', 'Access-Control-Allow-Origin' => '*']);
    }

    // TODO Add Limit

    public function getCocktailByIngredient(Request $request) {

        $values = $request->all();
        $ingredients = explode(",", str_replace("_", " ", strval($values["ingredients"] ?? "")));
        $shouldContainAllIngredients = $values["shouldContainAllIngredients"] ?? false;
        $limit = intval($values["limit"] ?? 20);

        $cocktailByIngredientQuery = "SELECT * FROM SharedCocktailDetails WHERE ";

        for ($i = 0; $i < count($ingredients); $i++) {
            $cocktailByIngredientQuery .= "(";
            $cocktailByIngredientQuery .= $this->createWhereForFindingAName($ingredients[$i], 'ingredientsDE', true);
            $cocktailByIngredientQuery .= $this->createWhereForFindingAName($ingredients[$i], 'ingredientsEN', false);
            $cocktailByIngredientQuery .= ")";
            $cocktailByIngredientQuery .= $i < count($ingredients) - 1 ? ($shouldContainAllIngredients ? " AND " : " OR ") : "";
        }

        $cocktailByIngredientQuery .= " LIMIT $limit";

        $data = DB::select($cocktailByIngredientQuery);
        return response(view("json.index", compact('data')),200, ['Content-Type' => 'application/json', 'Access-Control-Allow-Origin' => '*']);
    }

    public function getCocktailByName(Request $request) {

        $values = $request->all();
        $name = str_replace("_", " ", strval($values["name"] ?? ""));

        $cocktailByNameQuery = "SELECT * FROM SharedCocktailDetails WHERE {$this->createWhereForFindingAName($name, "name", false)}";
        $data = DB::select($cocktailByNameQuery);

        return response(view("json.index", compact('data')),200, ['Content-Type' => 'application/json', 'Access-Control-Allow-Origin' => '*']);
    }

    private function createWhereForFindingAName($targetValue, $targetRow, $endsWithOr = true) : string {
        $query = "UPPER({$targetRow}) = UPPER('{$targetValue}') OR
                    UPPER({$targetRow}) LIKE UPPER('%\"{$targetValue}%') OR
                    UPPER({$targetRow}) LIKE UPPER('%{$targetValue}\"%') OR
                    UPPER({$targetRow}) LIKE UPPER('%\"{$targetValue}\"%') OR
                    UPPER({$targetRow}) LIKE UPPER('% {$targetValue}%') OR
                    UPPER({$targetRow}) LIKE UPPER('%{$targetValue} %') OR
                    UPPER({$targetRow}) LIKE UPPER('% {$targetValue} %') OR
                    UPPER({$targetRow}) LIKE UPPER('%-{$targetValue}%') OR
                    UPPER({$targetRow}) LIKE UPPER('%{$targetValue}-%') OR
                    UPPER({$targetRow}) LIKE UPPER('%-{$targetValue}-%')";
        if ($endsWithOr) $query .= " OR ";
        return $query;
    }
}
