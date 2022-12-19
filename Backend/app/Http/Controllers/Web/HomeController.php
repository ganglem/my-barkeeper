<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use function view;

class HomeController extends Controller {

    public function index() {
        return view("home.index");
    }
}
