package shared

import mu.KLogger

interface Yoinkser {

    val logger: KLogger

    fun yoinks()
}