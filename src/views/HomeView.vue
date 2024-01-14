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
                    v-for="figure in calculatedFigures"
                    class="figure"
                    :class="{
                        selected: figure.point === selectedFigure,
                        black: figure.color === 'black',
                        white: figure.color === 'white',
                    }"
                    :style="{
                        left: figure.x * micaGap + 'px',
                        top: figure.y * micaGap + 'px',
                    }"
                    :key="`figure-${figure.x}-${figure.y}`"
                    @click="selectFigure(figure.point)"
                ></div>
            </div>
        </div>

        <button @click="makeMove">Make move</button>
    </div>
</template>

<script setup lang="ts">
    import { ref, onMounted, computed } from "vue";
    import Client, { type IGameState, type IMapData, type IMapObject, type ITakenPoint, type IPoint, type TPlayer, type TDifficulty } from "@/Client";
    import { vResize } from "../vueDirectives";

    interface ICalculatedFigure {
        x: number;
        y: number;
        color: "black" | "white";
        point: ITakenPoint;
    }

    interface ICalculatedPoint {
        x: number;
        y: number;
    }

    interface ICalculatedConnection {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    }

    interface IPlayerData {
        name: string;
        color: TPlayer;
        difficulty: TDifficulty;
        depth: number;
    }

    const gameState = ref<IGameState>({
        player: "black",
        unplacedPieces: {
            black: 8,
            white: 8,
        },
        occupiedPoints: [{ point: "D3", player: "white" }],
    });

    const loading = ref<boolean>(false);

    const mapsData = ref<Array<IMapObject> | null>(null);
    const selectedMap = ref<IMapObject | null>(null);
    const micaSize = ref<number | null>(null);

    const micaRef = ref<HTMLElement | null>(null);
    const micaGap = ref<number>(0);

    const selectedFigure = ref<ITakenPoint | null>(null);

    const whitePlayer = ref<IPlayerData>({
        name: "Player 1",
        color: "white",
        difficulty: "medium",
        depth: 4,
    });

    const blackPlayer = ref<IPlayerData>({
        name: "Player 2",
        color: "black",
        difficulty: "easy",
        depth: 3,
    });

    const calculatedPoints = computed<Array<ICalculatedPoint>>(() => {
        if (!selectedMap.value) return [];

        const points = [];

        for (let index = 0; index < selectedMap.value.map_data.points.length; index++) {
            const point = selectedMap.value.map_data.points[index];

            const coords = normalizeChessCord(separateChessCoordToXY(point)!);
            if (!coords) continue;

            points.push({
                x: coords.x,
                y: coords.y,
            });
        }

        return points;
    });

    const calculatedConnections = computed<Array<ICalculatedConnection>>(() => {
        if (!selectedMap.value) return [];

        const connections = [];

        for (let index = 0; index < selectedMap.value.map_data.connections.length; index++) {
            const connection = selectedMap.value.map_data.connections[index];
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

        return connections;
    });

    const calculatedFigures = computed<Array<ICalculatedFigure>>(() => {
        if (!gameState.value) return [];

        const figures = [];

        for (let index = 0; index < gameState.value.occupiedPoints.length; index++) {
            const point = gameState.value.occupiedPoints[index];

            const coords = normalizeChessCord(separateChessCoordToXY(point.point)!);
            if (!coords) continue;

            figures.push({
                x: coords.x,
                y: coords.y,
                color: point.player,
                point: point,
            });
        }

        return figures;
    });

    function selectFigure(figure: ITakenPoint) {
        selectedFigure.value = figure;
    }

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

        for (let index = 0; index < selectedMap.value.map_data.points.length; index++) {
            const point = selectedMap.value.map_data.points[index];

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
        if (!selectedMap.value) return;

        loading.value = true;

        const difficulty = gameState.value.player === "white" ? whitePlayer.value.difficulty : blackPlayer.value.difficulty;
        const depth = gameState.value.player === "white" ? whitePlayer.value.depth : blackPlayer.value.depth;

        try {
            gameState.value = await Client.calculateMove({
                mapName: selectedMap.value.map_name,
                difficulty: difficulty,
                depth: depth,
                gameState: gameState.value,
            });
        } catch (error) {
            console.error("Calculate move error: ", error);
        }

        loading.value = false;
    }

    function setSelectedMap(map: IMapObject) {
        selectedMap.value = map;

        micaSize.value = getMicaSize();
        calculateGap();
    }

    onMounted(async () => {
        mapsData.value = await Client.maps();

        if (mapsData.value && mapsData.value.length > 0) {
            setSelectedMap(mapsData.value[0]);
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

            background-color: rgb(225, 196, 144);

            .mica {
                width: 100%;
                height: 100%;

                position: relative;
                .point {
                    position: absolute;
                    width: 16px;
                    height: 16px;

                    background-color: rgb(69, 69, 69);
                    border-radius: 50%;

                    translate: -50% -50%;

                    z-index: 10;

                    cursor: pointer;

                    &:hover {
                        background-color: rgb(96, 96, 96);
                    }

                    &:active {
                        background-color: rgb(48, 48, 48);
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

                    cursor: pointer;

                    &.selected {
                        border: 3px solid rgb(196, 69, 225);
                    }

                    &.black {
                        background-color: black;
                    }

                    &.white {
                        background-color: white;
                    }

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
