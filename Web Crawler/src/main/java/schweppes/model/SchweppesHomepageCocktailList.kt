package schweppes.model

@kotlinx.serialization.Serializable
class Response {
   var took = 0
   var timed_out = false
   var _shards: Shards? = null
   var hits: Hit? = null
   var status = 0
}

@kotlinx.serialization.Serializable
class Hit {
   var _index: String? = null
   var _type: String? = null
   var _id: String? = null
   var _score: String? = null
   var _source: Source? = null
   var sort: ArrayList<Int>? = null
   var total: Total? = null
   var max_score: String? = null
   var hits: ArrayList<Hit>? = null
}

@kotlinx.serialization.Serializable
class SchweppesHomepageCocktailList {
   var took = 0
   var responses: ArrayList<Response>? = null
}

@kotlinx.serialization.Serializable
class Shards {
   var total = 0
   var successful = 0
   var skipped = 0
   var failed = 0
}

@kotlinx.serialization.Serializable
class Source {
   var alcohol: String? = null
   var visits = 0
   var flavour: ArrayList<String>? = null
   var ingredients_schweppes: ArrayList<String>? = null
   var name: String? = null
   var ingredients_sub_category: ArrayList<String>? = null
   var alcohol_exact = 0
   var countries: ArrayList<String>? = null
   var ingredients_spirits: ArrayList<String>? = null
   var slug: String? = null
   var ingredients_other: ArrayList<String>? = null
   var tags: ArrayList<String>? = null
   var htmlImage: String? = null
}

@kotlinx.serialization.Serializable
class Total {
   var value = 0
   var relation: String? = null
}

