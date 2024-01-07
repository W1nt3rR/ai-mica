<template>
    <div id="home">
        {{ gameState }}
        <button @click="makeMove">Make move</button>
    </div>
</template>

<script setup lang="ts">
    import { ref, onMounted } from "vue";
    import Client, { type ICalculateMoveDTO, type IMapObject } from "@/Client";

    const gameState = ref<ICalculateMoveDTO>({
        mapName: "map1",
        difficulty: "easy",
        gameState: {
            playerTurn: "white",
            pointsLeftoverBlack: 9,
            pointsLeftoverWhite: 9,
            pointsTaken: [],
        },
    });

    const mapsData = ref<Array<IMapObject | null>>();

    async function makeMove() {
        gameState.value.gameState = await Client.calculateMove(gameState.value);
    }

    onMounted(async () => {
        mapsData.value = await Client.maps();
    });
</script>

<style scoped lang="scss">
    #home {
        width: 100%;
        height: 100%;

        background-color: rgb(69, 69, 69);

        display: flex;
    }
</style>
