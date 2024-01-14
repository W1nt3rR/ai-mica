<template>
    <div
        class="full-screen-overlay"
        v-if="loading"
    >
        <span
            v-if="loading"
            class="loader"
        ></span>
    </div>

    <div id="home">
        <div class="mica-container">
            <div
                class="mica"
                ref="micaRef"
                v-resize="calculateGap"
            >
                <div
                    class="point"
                    v-for="point in calculatedPoints"
                    :key="`point-${point.x}-${point.y}`"
                    :style="{
                        left: point.x * micaGap + 'px',
                        top: point.y * micaGap + 'px',
                    }"
                ></div>

                <div
                    class="connection"
                    v-for="connection in calculatedConnections"
                    :key="`connection-${connection.x1}-${connection.y1}-${connection.x2}-${connection.y2}`"
                    :style="{
                        left: connection.x1 * micaGap + 'px',
                        top: connection.y1 * micaGap + 'px',
                        width: (connection.x2 - connection.x1) * micaGap + 'px',
                        height: (connection.y2 - connection.y1) * micaGap + 'px',
                    }"
                ></div>

                <div
                    class="figure"
                    v-for="figure in calculatedFigures"
                    :key="`figure-${figure.x}-${figure.y}`"
                    :style="{
                        left: figure.x * micaGap + 'px',
                        top: figure.y * micaGap + 'px',
                        backgroundColor: figure.color,
                    }"
                ></div>
            </div>
        </div>

        <button @click="makeMove">Make move</button>
    </div>
</template>

<script setup lang="ts">
    import { ref, onMounted, computed } from "vue";
    import Client, { type ICalculateMoveDTO, type IMapData, type IMapObject, type ITakenPoint, type IPoint } from "@/Client";
    import { vResize } from "../vueDirectives"

    const gameState = ref<ICalculateMoveDTO>({
        mapName: "map1",
        difficulty: "easy",
        depth: 4,
        gameState: {
            player: "black",
            unplacedPieces: {
                black: 8,
                white: 8,
            },
            occupiedPoints: [
                { point: "D3", player: "white" }
            ],
        },
    });
    const loading = ref<boolean>(false);

    const mapsData = ref<Array<IMapObject> | null>(null);
    const selectedMap = ref<IMapData | null>(null);
    const micaSize = ref<number | null>(null);

    const micaRef = ref<HTMLElement | null>(null);
    const micaGap = ref<number>(0);

    const calculatedPoints = computed(() => {
        if (!selectedMap.value) return [];

        const points = [];

        for (let index = 0; index < selectedMap.value.points.length; index++) {
            const point = selectedMap.value.points[index];

            const coords = normalizeChessCord(separateChessCoordToXY(point)!);
            if (!coords) continue;

            points.push({
                x: coords.x,
                y: coords.y,
            });
        }

        console.log("POINTS", points);

        return points;
    });

    const calculatedConnections = computed(() => {
        if (!selectedMap.value) return [];

        const connections = [];

        for (let index = 0; index < selectedMap.value.connections.length; index++) {
            const connection = selectedMap.value.connections[index];
            if (typeof connection[0] === "number") continue;

            const coords1 = normalizeChessCord(separateChessCoordToXY(connection[0])!);
            if (!coords1) continue;

            let coords2;

            for (let index = 1; index < connection.length; index++) {
                const point = connection[index];
                if (typeof point === "number") continue;

                coords2 = normalizeChessCord(separateChessCoordToXY(point)!);
                if (!coords2) continue;

                connections.push({
                    x1: coords1.x,
                    y1: coords1.y,
                    x2: coords2.x,
                    y2: coords2.y,
                });
            }
        }

        console.log("CONNECTIONS", connections);

        return connections;
    });

    const calculatedFigures = computed(() => {
        if (!gameState.value.gameState) return [];

        const figures = [];

        for (let index = 0; index < gameState.value.gameState.occupiedPoints.length; index++) {
            const point = gameState.value.gameState.occupiedPoints[index];

            const coords = normalizeChessCord(separateChessCoordToXY(point.point)!);
            if (!coords) continue;

            figures.push({
                x: coords.x,
                y: coords.y,
                color: point.player,
            });
        }

        console.log("FIGURES", figures);

        return figures;
    });

    function calculateGap(width?: number, height?: number) {
        if (!micaSize.value || !micaRef.value) return 0;
        const size = width ? width : getContainerSize();
        micaGap.value = size / (micaSize.value - 1);
    }

    function separateChessCoordToXY(coord: string): IPoint | null {
        const regArray = coord.match(/([a-zA-Z]+)(\d+)/);
        if (!regArray) return null;

        const [letters, numbers] = regArray.slice(1);
        const letterAsNumber = letters.toLowerCase().charCodeAt(0) - "a".charCodeAt(0);

        return {
            x: letterAsNumber,
            y: parseInt(numbers) - 1,
        };
    }

    function normalizeChessCord(coord: IPoint): IPoint {
        return {
            x: coord.x,
            y: getMicaSize() - coord.y - 1,
        };
    }

    function getMicaSize(): number {
        if (!selectedMap.value) return 0;

        let max = 0;

        for (let index = 0; index < selectedMap.value.points.length; index++) {
            const point = selectedMap.value.points[index];

            const coords = separateChessCoordToXY(point);
            if (!coords) continue;

            if (coords.x > max) max = coords.x;
            if (coords.y > max) max = coords.y;
        }

        return max + 1;
    }

    function getContainerSize() {
        if (!micaRef.value) return 0;
        return micaRef.value.clientWidth;
    }

    async function makeMove() {
        gameState.value.gameState = await Client.calculateMove(gameState.value);
    }

    function setSelectedMap(map: IMapData) {
        selectedMap.value = map;
    }

    onMounted(async () => {
        mapsData.value = await Client.maps();

        if (mapsData.value && mapsData.value.length > 0) {
            setSelectedMap(mapsData.value[0].map_data);
            micaSize.value = getMicaSize();
            calculateGap();

            console.log("MICA SIZE", micaSize.value);
        }

        console.log("MAPS", mapsData.value);

        (window as any).test1 = separateChessCoordToXY;
    });
</script>

<style scoped lang="scss">
    #home {
        width: 100%;
        height: 100%;

        padding: 40px;

        background-color: rgb(69, 69, 69);

        display: flex;
        justify-content: center;

        .mica-container {
            height: 100%;
            padding: 40px;
            aspect-ratio: 1;

            background-color: antiquewhite;

            .mica {
                width: 100%;
                height: 100%;

                position: relative;
                .point {
                    position: absolute;
                    width: 16px;
                    height: 16px;

                    background-color: rgb(128, 128, 128);
                    border-radius: 50%;

                    translate: -50% -50%;

                    z-index: 10;

                    cursor: pointer;

                    &:hover {
                        background-color: rgb(160, 160, 160);
                    }

                    &:active {
                        background-color: rgb(69, 69, 69);
                    }
                }

                .figure {
                    position: absolute;
                    width: 48px;
                    height: 48px;

                    border: 2px solid black;

                    border-radius: 50%;

                    translate: -50% -50%;

                    z-index: 20;

                    &:hover {
                        transform: brightness(1.2);
                    }

                    &:active {
                        transform: brightness(0.8);
                    }
                }

                .connection {
                    position: absolute;
                    border: 2px solid gray;

                    translate: -2px -2px;
                }
            }
        }
    }

    .full-screen-overlay {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 9999;

        width: 100vw;
        height: 100vh;

        background-color: rgba(0, 0, 0, 0.3);

        display: flex;
        justify-content: center;
        align-items: center;
    }

    .loader {
        width: 48px;
        height: 48px;
        border: 5px solid rgba($color: #ffffff, $alpha: 0.75);
        border-bottom-color: transparent;
        border-radius: 50%;
        display: inline-block;
        box-sizing: border-box;
        animation: rotation 1s linear infinite;
    }

    @keyframes rotation {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
</style>
