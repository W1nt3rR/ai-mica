import axios from "axios";

export type TDifficulty = "easy" | "medium" | "hard";
export type TPlayer = "black" | "white";

export interface ICalculateMoveDTO {
    mapName: string;
    difficulty: TDifficulty;
    gameState: IGameState;
}

export interface IGameState {
    pointsTaken: Array<ITakenPoint>;
    pointsLeftoverBlack: number;
    pointsLeftoverWhite: number;
    playerTurn: TPlayer;
}

export interface ITakenPoint {
    point: string;
    color: TPlayer;
}

export interface IMapObject {
    map_name: string;
    map_data: IMapData;
}

export interface IMapData {
    points: Array<string>;
    connections: Array<Array<string | number>>;
    mills: Array<Array<string | number>>;
}

export default class Client {
    /**
     * Gets the list of maps
     */
    public static async maps(): Promise<Array<IMapObject>> {
        const result = await axios.get("/maps/");
        return result.data;
    }

    /**
     * Calculates the next move for the AI
     */
    public static async calculateMove(currentGameState: ICalculateMoveDTO): Promise<IGameState> {
        const result = await axios.post("/calculatemove/", currentGameState);
        return result.data;
    }
}
