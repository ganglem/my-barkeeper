package shared.util

import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

object SerializationHelper {

    val json = Json { prettyPrint = true }

    inline fun <reified TypeOfObject> convertJsonStringToObject(jsonString: String) : TypeOfObject {
        return json.decodeFromString(jsonString)
    }

    inline fun <reified TypeOfObject> convertObjectToJsonString(obj: TypeOfObject) : String {
        return json.encodeToString(obj)
    }
}