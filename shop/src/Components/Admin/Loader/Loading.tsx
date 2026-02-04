import { Box, Flex } from "@mantine/core"
import "./Loading.css"
type LoadingProps = {
  position?: "center" | "top" | "bottom" | "left" | "right"
  height?: string
  width?: string
  size?: number
}
function Loading({position = "center", height = "100vh", width = "100vw", size = 240}: LoadingProps) {
  return (
    <Box>
      <Flex
        h={height}
        w={width}
        justify={position === "center" ? "center" : position === "left" ? "flex-start" : position === "right" ? "flex-end" : "center"}
        align={position === "center" ? "center" : position === "top" ? "flex-start" : position === "bottom" ? "flex-end" : "center"}
      >
        <svg className="pl" width={size} height={size} viewBox="0 0 240 240">
          <circle className="pl__ring pl__ring--a" cx="120" cy="120" r="105" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 660" strokeDashoffset="-330" strokeLinecap="round"></circle>
          <circle className="pl__ring pl__ring--b" cx="120" cy="120" r="35" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 220" strokeDashoffset="-110" strokeLinecap="round"></circle>
          <circle className="pl__ring pl__ring--c" cx="85" cy="120" r="70" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
          <circle className="pl__ring pl__ring--d" cx="155" cy="120" r="70" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
        </svg>
      </Flex>
    </Box>
  )
}
export default Loading
