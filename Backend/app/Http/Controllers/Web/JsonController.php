<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use \Illuminate\Http\Request;

class JsonController extends Controller {

    public function bean() {
        $data = array(
            "name" => "shmollest bean",
            "attributes" => [
                "shizhe" => "shmollest",
                "team" => "bean",
                "whatIsSheLookingFor" => "fun",
                "whatDoesSheHave" => "heebie jeebies",
                "shape" => [
                    "ushual" => "shircle",
                    "shometimesh" => "shpere"
                ],
                "ish it?" => "it ish!",
            ]
        );
        return response(view("json.index", compact('data')),200, ['Content-Type' => 'application/json', 'Access-Control-Allow-Origin' => '*']);
    }

    public function add(Request $request) {

        $values = $request->all();
        $a = intval($values["a"] ?? 0);
        $b = intval($values["b"] ?? 0);
        $result = $a + $b;

        $data = array (
            "a" => $a,
            "b" => $b,
            "result" => $result
        );

        return response(view("json.index", compact('data')),200, ['Content-Type' => 'application/json', 'Access-Control-Allow-Origin' => '*']);
    }
}
