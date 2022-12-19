package shared.util

import mu.KotlinLogging
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.internal.http.RealResponseBody
import okio.GzipSource
import okio.buffer
import shared.util.HttpHelper.encodeValue
import java.io.IOException

object Translator {

    private val logger = KotlinLogging.logger { }

    enum class LANGUAGES {
        DE, EN
    }

    fun translate(text: String, from: LANGUAGES, to: LANGUAGES): String? {
        logger.info { "Translating text from $from to $to" }
        if (from == to) return text
        if (text.split(".").size > 1) {
            return text.split(".").joinToString(". ") {
                translate(it, from, to) ?: it
            }
        }
        if (text.isEmpty()) return ""
        val encodedText = encodeValue(text)
        val clientBuilder = OkHttpClient.Builder().addInterceptor(UnzippingInterceptor())
        val client = clientBuilder.build()
        val request = createGoogleTranslationRequest(encodedText, from, to)
        logger.info { "Sending translation request to google" }
        val response = client.newCall(request).execute()
        logger.info { "Translation successful" }
        return getTranslationFromResponse(text, response.body!!.string())
    }

    private fun createGoogleTranslationRequest(encodedText: String, from: LANGUAGES, to: LANGUAGES): Request {
        val body = "f.req=%5B%5B%5B%22MkEWBc%22%2C%22%5B%5B%5C%22$encodedText%5C%22%2C%5C%22${from.name.lowercase()}%5C%22%2C%5C%22${to.name.lowercase()}%5C%22%2Ctrue%5D%2C%5Bnull%5D%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&at=AAaZcx3lh1zp86o7oACAyDdrRGvO%3A1655984356143&"
        return Request.Builder()
            .url("https://translate.google.com/_/TranslateWebserverUi/data/batchexecute?rpcids=MkEWBc&source-path=%2F&f.sid=4255937418460946282&bl=boq_translate-webserver_20220621.10_p0&hl=de&soc-app=1&soc-platform=1&soc-device=1&_reqid=49158&rt=c")
            .post(body.toRequestBody("application/x-www-form-urlencoded;charset=utf-8".toMediaType()))
            .addHeader("Host", "translate.google.com")
            .addHeader("Accept", "*/*")
            .addHeader("Accept-Language", "de,en-US;q=0.7,en;q=0.3")
            .addHeader("Accept-Encoding", "gzip, deflate, br")
            .addHeader("Referer", "https://translate.google.com/")
            .addHeader("X-Same-Domain", "1")
            .addHeader("X-Goog-BatchExecute-Bgr", "[\";w9243ZDQAAYcUdjWPFFfDpnZTO6mqvQmACkAIwj8RoHDp5LFfwXt4GsqlSZhtVyFhorcx9py-ATYNU2WbS6YUbnanB8AAAFXTwAAAAV1AQcXAM0mvyuna0RyBVRbnJ8e1YGEBbF2HYurn05KMcc7atmt4NlJwdHJpQCXMv4A56mRaXMWrMogmWWvI5oXHm8pab_8fCa20VaS1n9GJGcJ1i4P0XXP8P1evHeY505jorEdC2OrwKmNLdw9Ystl5kHdcaUJo8KNw7Au4f7gVmoiWpYrTJP82s0ClvzFsBrtL8aDI9c3-TSRZ0Yy-NcHWY4BS8WwBvQzMO-geJAV80UrNKo4tkUpiIWH85bv4nt2YafPKjfeHVyW419IUrjaoTo9hAJRJVkp4thC9og_TmZkOR9PLsyXSEetH0A0lWak5SRzw4X4ncSmrA7W0xBfHWlE2QuE8YZdkxWFVqToeGi9iqBoDD8ylICORwo5BxwlTyB-5q8n8bw4NtjUEzTHoZ2j_mABUer2fynPTuFaZJZSF6Y_7ikecKEuThx27RE_P0H7ku2blQsFZDw1qGdPpPk9D8x449WXHoIe8Cs8LNKWJ9YggOzIuIPl4fzf2SWmrpReCxbn2ipbw5md7VKqMLyVwqdoLy2wce_c_NQCcWW79A9yhfHPqnHMW0X7gFxKbrf31i3KAUJSl7Aq64hKMsjNroEW14cwS9wtvIBtFsk0AxcvgxSoOigxWwCMiUycIBLIX8UrjjO-KQIEdHpDC4C__9xSOe1s5VbK9uCzzURAM7_CXLTVWbKkZFjS9_2PMgZpdQaCwcZS9JJdUcn5yn-iNb-gysUkrav4e_uI3ydLPCILeref2DzwiUqvoZuA8fXQtj9EY0H-nuMKL0heotQ6aPnA5ixcCAvThogmL5iPF80TYpKvbQWZioXzo_6jJWKr_0sGcW59JjxHrRVW_huUXq2BlvZp5-Y6lQP9RRJHzjFk2u5XjpCYCMV3Vd-wsTZORvlJug91IOgPHNN5Vu_PDUP1ya-CJQXcS46yGMVrbrHqgRDYuyrj1SypG2_9yq5rpokZM3uHcaCfZKa_Keu5vzoEE5QLHxjWkplMz1jO03b8CgCeExrqrzBP2pFHfv_3aGhSxrgS2PfH90xS24Q37lVx661YtVUikhlmVXquL0symvY\",null,null,920,308,null,null,0,\"2\"]")
            .addHeader("Content-Type", "application/x-www-form-urlencoded;charset=utf-8")
            .addHeader("Content-Length", "232")
            .addHeader("DNT", "1")
            .addHeader("Alt-Used", "translate.google.com")
            .addHeader("Connection", "keep-alive")
            .addHeader("Cookie", "CONSENT=YES+srp.gws-20210715-0-RC1.de+FX+083; NID=511=BTpVWbppWBdJvTsz-8DmQ5TIqUJoYT1aizSoxIE9i_tYcrkKR0fKTb1V93Ql0oVnegrKEelZxuLYbDblGSuCLcksbS5JGNLwMCZOmWc5_MmO80IICvc8ehLeFs_88mDEL-mGh7MbRC647uElQAK_tfXLhpf4se70cnqeqnR69podb7_oF8CmqO48Ex3woM0afnm3jskE9CM_rVN6Hi2Az4HGtB4JHXcNjyum09f_9q0_pzPSTjlUvjA99WgpcWkPUjjERNo-eNEtFewrDSzzY6iFEFFe; 1P_JAR=2022-06-23-11; ANID=AHWqTUk8sCf2a4KfEpgFNvA8ny3nAvY20sfdtyI1onbMzbi4L6yiyWHGo5Tx0SdK; SID=LQiN-uy1s35KkAfKVPSgNqspKAUCjufJZVWrFj-6LvbsBoMWRakQcLCAUPBi6sZpya0QnQ.; __Secure-1PSID=LQiN-uy1s35KkAfKVPSgNqspKAUCjufJZVWrFj-6LvbsBoMWK9BsM9xFiVTOc9yD7dHjWQ.; __Secure-3PSID=LQiN-uy1s35KkAfKVPSgNqspKAUCjufJZVWrFj-6LvbsBoMWO5wUqNTL1iIhsAjU59qibg.; HSID=AX3Y92HH6-kaUIadS; SSID=AfJnvK7y331wYpckF; APISID=ST0A-VjYyup5u9l-/ArwXewCb1U2ITEgks; SAPISID=2kEG5g4So3veRK2q/AuqflyeC3AvhmiGYh; __Secure-1PAPISID=2kEG5g4So3veRK2q/AuqflyeC3AvhmiGYh; __Secure-3PAPISID=2kEG5g4So3veRK2q/AuqflyeC3AvhmiGYh; SIDCC=AJi4QfGd7PX7W7mV8NBbWRFjzDCoVtXRGez7zihXNVhptVJFBYprD-SF921bGjiKl3EKG76T2A; __Secure-3PSIDCC=AJi4QfH3v7xUiDqmjHoPbDCRhFVw5J8uBTK2DA3XGtlOWCz2LkyGbXFyfdkDYaylr41XMNbMQaM; SEARCH_SAMESITE=CgQIrZQB; OGPC=19026101-2:; AEC=AakniGOQ7NyIW12vqw2zQywI2tx795zV2GxOc-o2QtMGtbIPqirIeRyoPQ; __Secure-1PSIDCC=AJi4QfGoHlQCWcQh1SJwIsigUaJA8Fr6ubx9oylMgT8VcbcoVRF4TY6F9GkOqiKw3-PW7NW-7qg; _ga=GA1.3.668606469.1655983620; _gid=GA1.3.2076741646.1655983620; OTZ=6561327_48_52_123900_48_436380")
            .addHeader("Sec-Fetch-Dest", "empty")
            .addHeader("Sec-Fetch-Mode", "no-cors")
            .addHeader("Sec-Fetch-Site", "same-origin")
            .addHeader("TE", "trailers")
            .addHeader("Pragma", "no-cache")
            .addHeader("Cache-Control", "no-cache")
            .build()
    }

    private fun getTranslationFromResponse(originalText: String, responseBody: String): String? {
        val responseChunks = responseBody.split("\\\"")
        responseChunks.forEachIndexed { i, responseChunk ->
            if(responseChunk.trim() == originalText.trim()) {
                return cleanUpTranslatedText(responseChunks[i + 2])
            }
        }
        logger.warn { "No translation found" }
        return null
    }

    private fun cleanUpTranslatedText(text: String): String {
        return text.replace(" -", "-")
    }
}

private class UnzippingInterceptor : Interceptor {
    @Throws(IOException::class)
    override fun intercept(chain: Interceptor.Chain): Response {
        val response: Response = chain.proceed(chain.request())
        return unzip(response)
    }

    // copied from okhttp3.internal.http.HttpEngine (because is private)
    @Throws(IOException::class)
    private fun unzip(response: Response): Response {
        if (response.body == null) {
            return response
        }

        //check if we have gzip response
        val contentEncoding: String? = response.headers["Content-Encoding"]

        //this is used to decompress gzipped responses
        return if (contentEncoding != null && contentEncoding == "gzip") {
            val contentLength: Long = response.body!!.contentLength()
            val responseBody = GzipSource(response.body!!.source())
            val strippedHeaders: Headers = response.headers.newBuilder().build()
            response.newBuilder().headers(strippedHeaders)
                .body(
                    RealResponseBody(
                        response.body!!.contentType().toString(),
                        contentLength,
                        responseBody.buffer()
                    )
                )
                .build()
        } else {
            response
        }
    }
}