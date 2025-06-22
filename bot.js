const BotConstants = {
    KINGDOM_SIZE_MIN: 1,
    KINGDOM_SIZE_MAX: 1000,
    SLIDER_MAX: 100,
};

const BotUtility = {
    Sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    MaxDistance(x1, y1, x2, y2) {
        return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
    },

    RandomElement(arr) {
        if (arr.length === 0) return undefined;
        return arr[Math.floor(Math.random() * arr.length)];
    }
};

const BotGameLogic = {
    ProtectedAllies: window.protectedAllies || (window.protectedAllies = []),
    KingRealmSize: typeof window.kingRealmSize === 'number' ? window.kingRealmSize : 8,

    GetPlayersFromLeaderboard() {
        const container = document.getElementById("leaderboard-map-Leaderboard");
        if (!container) return [];

        const players = [];
        const playerDivs = container.querySelectorAll(":scope > .lb-players");

        playerDivs.forEach(div => {
            const idMatch = div.id.match(/player-container-(\d+)-Leaderboard/);
            if (!idMatch) return;

            const playerId = parseInt(idMatch[1], 10);
            const nameSpan = div.querySelector(".player-name");
            if (!nameSpan) return;

            players.push({
                id: playerId,
                name: nameSpan.textContent.trim(),
                color: nameSpan.style.color || "black",
            });
        });

        return players;
    },

    IsEnemy(x, y) {
        const team = teams[x][y];
        if (!team) return false;
        if (team === selfId) return false;
        if (this.ProtectedAllies.includes(team)) return false;
        return true;
    },

    IsAlly(x, y) {
        const team = teams[x][y];
        if (!team) return false;
        if (team === selfId) return true;
        if (this.ProtectedAllies.includes(team)) return true;
        return false;
    },

    GetLegalMoves(x, y) {
        return generateLegalMoves(x, y, board, teams);
    },

    IsNeutralPiece(x, y) {
        return teams[x][y] === 0 && board[x][y] !== 0;
    },

    GetPieceType(x, y) {
        return board[x]?.[y] ?? 0;
    },

    IsLongRangePiece(type) {
        return [3, 4, 5].includes(type);
    },

    IsInsideKingRealm(x, y, kingX, kingY) {
        return BotUtility.MaxDistance(x, y, kingX, kingY) <= Math.floor(this.KingRealmSize);
    },

    FindKingPosition() {
        for (let x = 0; x < boardW; x++) {
            for (let y = 0; y < boardH; y++) {
                if (this.GetPieceType(x, y) === 6 && this.IsAlly(x, y)) return { x, y };
            }
        }
        return null;
    },

    IsSquareDangerous(x, y) {
        for (let i = 0; i < boardW; i++) {
            for (let j = 0; j < boardH; j++) {
                if (this.IsEnemy(i, j)) {
                    const moves = this.GetLegalMoves(i, j);
                    if (moves.some(([mx, my]) => mx === x && my === y)) return true;
                }
            }
        }
        return false;
    },

    CalculateThreatScore(x, y, kingX, kingY) {
        const pieceType = this.GetPieceType(x, y);
        const dist = BotUtility.MaxDistance(x, y, kingX, kingY);

        if (pieceType === 6) return 100 - dist;
        if (pieceType === 2) return 70 - dist;
        if (this.IsLongRangePiece(pieceType)) return 40 - dist;

        return 20 - dist;
    },

    GetCoveredSquares(x, y) {
        return this.GetLegalMoves(x, y);
    },

    FindCapturableEnemies() {
        const targets = [];
        const range = Math.floor(this.KingRealmSize);
        const king = this.FindKingPosition();
        if (!king) return targets;

        for (let x = 0; x < boardW; x++) {
            for (let y = 0; y < boardH; y++) {
                if (this.IsEnemy(x, y)) {

                    let capturable = false;
                    for (let ax = 0; ax < boardW; ax++) {
                        for (let ay = 0; ay < boardH; ay++) {
                            if (this.IsAlly(ax, ay)) {
                                if (BotUtility.MaxDistance(ax, ay, king.x, king.y) > range) continue;

                                const moves = this.GetLegalMoves(ax, ay);
                                if (moves.some(([mx, my]) => mx === x && my === y)) {
                                    capturable = true;
                                    break;
                                }
                            }
                        }
                        if (capturable) break;
                    }

                    if (capturable) targets.push({ x, y });
                }
            }
        }
        return targets;
    },

    IsSquareCovered(x, y) {
        for (let ax = 0; ax < boardW; ax++) {
            for (let ay = 0; ay < boardH; ay++) {
                if (this.IsAlly(ax, ay)) {
                    const moves = this.GetCoveredSquares(ax, ay);
                    if (moves.some(([mx, my]) => mx === x && my === y)) return true;
                }
            }
        }
        return false;
    },

    PieceTypeName(type) {
        switch (type) {
            case 6: return "King";
            case 5: return "Queen";
            case 4: return "Rook";
            case 3: return "Bishop";
            case 2: return "Knight";
            case 1: return "Pawn";
            default: return "Unknown";
        }
    }
};

const BotUI = {
    CreateAllySelectionMenu() {
        const existingMenu = document.getElementById("allySelectionMenu");
        if (existingMenu) existingMenu.remove();

        const menu = document.createElement("div");
        menu.id = "allySelectionMenu";

        Object.assign(menu.style, {
            position: "fixed",
            top: "50px",
            left: "10px",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            fontFamily: "monospace",
            fontSize: "14px",
            padding: "10px",
            maxHeight: "360px",
            overflowY: "auto",
            zIndex: 100000,
            borderRadius: "6px",
            width: "280px",
            userSelect: "none",
        });

        const title = document.createElement("div");
        title.textContent = "Select Allies to Protect (Leaderboard)";
        title.style.marginBottom = "8px";
        menu.appendChild(title);

        // ON/OFF toggle
        const onOffContainer = document.createElement("div");
        onOffContainer.style.marginBottom = "12px";
        onOffContainer.style.display = "flex";
        onOffContainer.style.alignItems = "center";
        onOffContainer.style.gap = "12px";

        const onOffLabel = document.createElement("label");
        onOffLabel.textContent = "Bot Active:";
        onOffLabel.style.flexShrink = "0";

        const onOffCheckbox = document.createElement("input");
        onOffCheckbox.type = "checkbox";
        onOffCheckbox.checked = !!window.botActive;
        onOffCheckbox.onchange = () => {
            window.botActive = onOffCheckbox.checked;
        };

        onOffContainer.appendChild(onOffLabel);
        onOffContainer.appendChild(onOffCheckbox);
        menu.appendChild(onOffContainer);


        // Status message container
        const statusDiv = document.createElement("div");
        statusDiv.id = "botActionStatus";
        statusDiv.style.marginTop = "10px";
        statusDiv.style.fontSize = "13px";
        statusDiv.style.color = "#ffcc00";
        statusDiv.style.fontWeight = "bold";
        menu.appendChild(statusDiv);

        const sizeContainer = document.createElement("div");
        sizeContainer.style.marginBottom = "12px";
        sizeContainer.style.display = "flex";
        sizeContainer.style.alignItems = "center";
        sizeContainer.style.gap = "8px";
        sizeContainer.style.userSelect = "none";

        const sizeLabel = document.createElement("label");
        sizeLabel.textContent = "Kingdom Size:";
        sizeLabel.style.flexShrink = "0";

        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = BotConstants.KINGDOM_SIZE_MIN;
        slider.max = BotConstants.SLIDER_MAX;
        slider.step = 1;
        slider.value = Math.min(BotConstants.SLIDER_MAX, BotGameLogic.KingRealmSize);
        slider.style.flexGrow = "1";

        const numberInput = document.createElement("input");
        numberInput.type = "number";
        numberInput.min = BotConstants.KINGDOM_SIZE_MIN;
        numberInput.max = BotConstants.KINGDOM_SIZE_MAX;
        numberInput.value = BotGameLogic.KingRealmSize;
        numberInput.style.width = "60px";
        numberInput.style.backgroundColor = "black";
        numberInput.style.color = "white";
        numberInput.style.border = "1px solid white";
        numberInput.style.borderRadius = "3px";
        numberInput.style.textAlign = "center";

        slider.oninput = () => {
            const val = parseInt(slider.value, 10);
            numberInput.value = val;
            BotGameLogic.KingRealmSize = val;
            window.kingRealmSize = val;
        };

        numberInput.onchange = () => {
            let val = parseInt(numberInput.value, 10);
            if (isNaN(val) || val < BotConstants.KINGDOM_SIZE_MIN) val = BotConstants.KINGDOM_SIZE_MIN;
            else if (val > BotConstants.KINGDOM_SIZE_MAX) val = BotConstants.KINGDOM_SIZE_MAX;

            numberInput.value = val;
            slider.value = Math.min(val, BotConstants.SLIDER_MAX);
            BotGameLogic.KingRealmSize = val;
            window.kingRealmSize = val;
        };

        sizeContainer.appendChild(sizeLabel);
        sizeContainer.appendChild(slider);
        sizeContainer.appendChild(numberInput);
        menu.appendChild(sizeContainer);

        const players = BotGameLogic.GetPlayersFromLeaderboard();

        if (players.length === 0) {
            const noPlayersMessage = document.createElement("div");
            noPlayersMessage.textContent = "No players detected on leaderboard.";
            menu.appendChild(noPlayersMessage);
        }

        players.forEach(player => {
            const label = document.createElement("label");
            label.style.display = "flex";
            label.style.alignItems = "center";
            label.style.cursor = "pointer";
            label.style.marginBottom = "4px";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = player.id;
            checkbox.checked = BotGameLogic.ProtectedAllies.includes(player.id);
            checkbox.style.marginRight = "8px";

            checkbox.onchange = () => {
                const id = parseInt(checkbox.value, 10);
                if (checkbox.checked) {
                    if (!BotGameLogic.ProtectedAllies.includes(id)) BotGameLogic.ProtectedAllies.push(id);
                } else {
                    BotGameLogic.ProtectedAllies = BotGameLogic.ProtectedAllies.filter(x => x !== id);
                    window.protectedAllies = BotGameLogic.ProtectedAllies;
                }
            };

            const colorIndicator = document.createElement("span");
            colorIndicator.style.display = "inline-block";
            colorIndicator.style.width = "14px";
            colorIndicator.style.height = "14px";
            colorIndicator.style.backgroundColor = player.color;
            colorIndicator.style.marginRight = "6px";
            colorIndicator.style.border = "1px solid white";
            colorIndicator.style.borderRadius = "3px";

            label.appendChild(checkbox);
            label.appendChild(colorIndicator);
            label.appendChild(document.createTextNode(player.name));

            menu.appendChild(label);
        });

        document.body.appendChild(menu);
    },

    UpdateActionStatus(message) {
        const statusDiv = document.getElementById("botActionStatus");
        if (statusDiv) statusDiv.textContent = message;
    }
};

const BotController = {
    prevPositions: new Map(),

    async BotLoop() {

        if (!window.botActive) {
            setTimeout(() => this.BotLoop(), 500);
            return;
        }


        const kingPos = BotGameLogic.FindKingPosition();
        if (!kingPos) {
            setTimeout(() => this.BotLoop(), 500);
            return;
        }

        const { x: kx, y: ky } = kingPos;
        const range = Math.floor(BotGameLogic.KingRealmSize);

        const kingMoves = BotGameLogic.GetLegalMoves(kx, ky);
        const kingInDanger = BotGameLogic.IsSquareDangerous(kx, ky);

        const enemyPriority = { 6: 1, 5: 2, 4: 3, 3: 4, 2: 5, 1: 6 };

        if (kingInDanger) {

            const threateningEnemies = [];
            for (let i = 0; i < boardW; i++) {
                for (let j = 0; j < boardH; j++) {
                    if (BotGameLogic.IsEnemy(i, j)) {
                        const moves = BotGameLogic.GetLegalMoves(i, j);
                        if (moves.some(([mx, my]) => mx === kx && my === ky)) {
                            threateningEnemies.push({ x: i, y: j });
                        }
                    }
                }
            }

            const captureMovesAgainstThreat = [];
            for (let ax = 0; ax < boardW; ax++) {
                for (let ay = 0; ay < boardH; ay++) {
                    if (BotGameLogic.IsAlly(ax, ay) && BotGameLogic.GetPieceType(ax, ay) !== 6) {
                        const moves = BotGameLogic.GetLegalMoves(ax, ay);
                        for (const [mx, my] of moves) {
                            if (threateningEnemies.some(e => e.x === mx && e.y === my)) {
                                captureMovesAgainstThreat.push({ fromX: ax, fromY: ay, toX: mx, toY: my, pieceType: BotGameLogic.GetPieceType(ax, ay) });
                            }
                        }
                    }
                }
            }

            if (captureMovesAgainstThreat.length > 0) {

                captureMovesAgainstThreat.sort((a, b) => a.pieceType - b.pieceType);
                const best = captureMovesAgainstThreat[0];
                BotUI.UpdateActionStatus(`Ally ${BotGameLogic.PieceTypeName(best.pieceType)} at (${best.fromX},${best.fromY}) captures threat to king at (${best.toX},${best.toY})`);
                BotController.SendMove(best.fromX, best.fromY, best.toX, best.toY);
                await BotUtility.Sleep(25);
                return this.BotLoop();
            }


   
            const safeMoves = kingMoves.filter(([x, y]) => !BotGameLogic.IsSquareDangerous(x, y));

            const captureMoves = kingMoves.filter(([x, y]) => {
                if (!BotGameLogic.IsEnemy(x, y)) return false;

                const defendedByEnemy = this.IsEnemyPieceDefended(x, y);

                return !defendedByEnemy; 
            });

            if (safeMoves.length > 0) {
                const move = BotUtility.RandomElement(safeMoves);
                if (move) {
                    BotUI.UpdateActionStatus(`King moves to safety at (${move[0]}, ${move[1]})`);
                    BotController.SendMove(kx, ky, move[0], move[1]);
                    await BotUtility.Sleep(25);
                    return this.BotLoop();
                }
            } else if (captureMoves.length > 0) {
                const move = BotUtility.RandomElement(captureMoves);
                if (move) {
                    BotUI.UpdateActionStatus(`King captures undefended enemy at (${move[0]}, ${move[1]}) while in danger`);
                    BotController.SendMove(kx, ky, move[0], move[1]);
                    await BotUtility.Sleep(25);
                    return this.BotLoop();
                }
            }

            for (const threat of threateningEnemies) {
                const path = GetPathBetween(threat.x, threat.y, kx, ky);

                for (const [bx, by] of path) {
                    if (board[bx][by] === 0) {
                        const candidateInterpositions = [];

                        for (let ax = 0; ax < boardW; ax++) {
                            for (let ay = 0; ay < boardH; ay++) {
                                if (BotGameLogic.IsAlly(ax, ay) && BotGameLogic.GetPieceType(ax, ay) !== 6) {
                                    const moves = BotGameLogic.GetLegalMoves(ax, ay);
                                    if (moves.some(([mx, my]) => mx === bx && my === by)) {
   
                                        let defended = false;
                                        for (let dx = 0; dx < boardW; dx++) {
                                            for (let dy = 0; dy < boardH; dy++) {
                                                if ((dx !== ax || dy !== ay) && BotGameLogic.IsAlly(dx, dy)) {
                                                    const allyMoves = BotGameLogic.GetLegalMoves(dx, dy);
                                                    if (allyMoves.some(([amx, amy]) => amx === bx && amy === by)) {
                                                        defended = true;
                                                        break;
                                                    }
                                                }
                                            }
                                            if (defended) break;
                                        }

                                        candidateInterpositions.push({
                                            fromX: ax,
                                            fromY: ay,
                                            toX: bx,
                                            toY: by,
                                            pieceType: BotGameLogic.GetPieceType(ax, ay),
                                            defended,
                                        });
                                    }
                                }
                            }
                        }

                        if (candidateInterpositions.length > 0) {
                            candidateInterpositions.sort((a, b) => {
                                if (a.defended === b.defended) return 0;
                                if (a.defended) return -1;
                                return 1;
                            });

                            const best = candidateInterpositions[0];
                            BotUI.UpdateActionStatus(`Interpose piece ${BotGameLogic.PieceTypeName(best.pieceType)} from (${best.fromX},${best.fromY}) to block threat at (${best.toX},${best.toY}), defended: ${best.defended}`);
                            BotController.SendMove(best.fromX, best.fromY, best.toX, best.toY);
                            await BotUtility.Sleep(25);
                            return this.BotLoop();
                        }
                    }
                }
            }
        }

        const capturableEnemies = [];
        for (let x = 0; x < boardW; x++) {
            for (let y = 0; y < boardH; y++) {
                if (BotGameLogic.IsEnemy(x, y)) {
                    let capturable = false;
                    for (let ax = 0; ax < boardW; ax++) {
                        for (let ay = 0; ay < boardH; ay++) {
                            if (BotGameLogic.IsAlly(ax, ay) && BotGameLogic.GetPieceType(ax, ay) !== 6) {
                                const moves = BotGameLogic.GetLegalMoves(ax, ay);
                                if (moves.some(([mx, my]) => mx === x && my === y)) {
                                    capturable = true;
                                    break;
                                }
                            }
                        }
                        if (capturable) break;
                    }
                    if (capturable) capturableEnemies.push({ x, y });
                }
            }
        }

        for (let x = 0; x < boardW; x++) {
            for (let y = 0; y < boardH; y++) {
                if (!BotGameLogic.IsAlly(x, y)) continue;
                if (BotGameLogic.GetPieceType(x, y) === 6) continue; // Exclure roi
                if (BotGameLogic.IsInsideKingRealm(x, y, kx, ky)) continue; // Ignore pièces dans royaume

                const moves = BotGameLogic.GetLegalMoves(x, y);
                for (const [mx, my] of moves) {
                    if (BotGameLogic.IsEnemy(mx, my)) {
                        BotUI.UpdateActionStatus(`Ally piece at (${x},${y}) captures enemy at (${mx},${my}) outside kingdom`);
                        BotController.SendMove(x, y, mx, my);
                        await BotUtility.Sleep(25);
                        return this.BotLoop();
                    }
                }
            }
        }

        for (let x = 0; x < boardW; x++) {
            for (let y = 0; y < boardH; y++) {
                if (BotGameLogic.IsAlly(x, y)) {
                    const pieceType = BotGameLogic.GetPieceType(x, y);
                    if (pieceType === 6) continue;

                    if (!BotGameLogic.IsInsideKingRealm(x, y, kx, ky) && BotGameLogic.IsSquareDangerous(x, y)) {
                        const legalMoves = BotGameLogic.GetLegalMoves(x, y);
                        const safeMoves = legalMoves.filter(([tx, ty]) => {
                            if (BotGameLogic.IsSquareDangerous(tx, ty)) return false;

                            const originalPiece = board[tx][ty];
                            board[tx][ty] = pieceType;
                            board[x][y] = 0;

                            const kingPosAfterMove = BotGameLogic.FindKingPosition();
                            const kingSafeAfterMove = kingPosAfterMove ? !BotGameLogic.IsSquareDangerous(kingPosAfterMove.x, kingPosAfterMove.y) : false;

                            board[x][y] = pieceType;
                            board[tx][ty] = originalPiece;

                            return kingSafeAfterMove;
                        });

                        if (safeMoves.length > 0) {
                            const move = BotUtility.RandomElement(safeMoves);
                            if (move) {
                                BotUI.UpdateActionStatus(`Ally piece outside kingdom at (${x}, ${y}) moves to safe square (${move[0]}, ${move[1]})`);
                                BotController.SendMove(x, y, move[0], move[1]);
                                await BotUtility.Sleep(25);
                                return this.BotLoop();
                            }
                        }
                    }
                }
            }
        }

        const alliesOtherThanKing = [];
        for (let x = 0; x < boardW; x++) {
            for (let y = 0; y < boardH; y++) {
                if (BotGameLogic.IsAlly(x, y) && BotGameLogic.GetPieceType(x, y) !== 6) {
                    alliesOtherThanKing.push({ x, y });
                }
            }
        }

        if (alliesOtherThanKing.length === 0) {
            const kingPos = BotGameLogic.FindKingPosition();
            if (kingPos) {
                const kingMoves = BotGameLogic.GetLegalMoves(kingPos.x, kingPos.y);

                for (const move of kingMoves) {
                    const [mx, my] = move;
                    if (BotGameLogic.IsEnemy(mx, my)) {
                        const isDefended = BotController.IsEnemyPieceDefended(mx, my);
                        if (isDefended) continue;  

                        BotUI.UpdateActionStatus(`King at (${kingPos.x}, ${kingPos.y}) captures undefended enemy at (${mx}, ${my})`);
                        BotController.SendMove(kingPos.x, kingPos.y, mx, my);
                        await BotUtility.Sleep(25);
                        return this.BotLoop();
                    } else if (BotGameLogic.IsNeutralPiece(mx, my)) {
                        BotUI.UpdateActionStatus(`King at (${kingPos.x}, ${kingPos.y}) captures neutral piece at (${mx}, ${my})`);
                        BotController.SendMove(kingPos.x, kingPos.y, mx, my);
                        await BotUtility.Sleep(25);
                        return this.BotLoop();
                    }
                }


                let targets = [];
                for (let x = 0; x < boardW; x++) {
                    for (let y = 0; y < boardH; y++) {
                        if ((BotGameLogic.IsEnemy(x, y) || BotGameLogic.IsNeutralPiece(x, y)) && BotGameLogic.IsInsideKingRealm(x, y, kingPos.x, kingPos.y)) {
                            targets.push([x, y]);
                        }
                    }
                }

                if (targets.length > 0) {

                    targets.sort((a, b) => BotUtility.MaxDistance(kingPos.x, kingPos.y, a[0], a[1]) - BotUtility.MaxDistance(kingPos.x, kingPos.y, b[0], b[1]));
                    const closestTarget = targets[0];

                    const movesCloser = kingMoves.filter(([mx, my]) =>
                        BotUtility.MaxDistance(mx, my, closestTarget[0], closestTarget[1]) < BotUtility.MaxDistance(kingPos.x, kingPos.y, closestTarget[0], closestTarget[1])
                    );

                    if (movesCloser.length > 0) {
                        const move = movesCloser[0];
                        BotUI.UpdateActionStatus(`King at (${kingPos.x}, ${kingPos.y}) moves closer to target at (${closestTarget[0]}, ${closestTarget[1]})`);
                        BotController.SendMove(kingPos.x, kingPos.y, move[0], move[1]);
                        await BotUtility.Sleep(25);
                        return this.BotLoop();
                    }
                }
            }
        }


        const targetsEnemy = [];
        for (let x = 0; x < boardW; x++) {
            for (let y = 0; y < boardH; y++) {
                if (!BotGameLogic.IsEnemy(x, y)) continue;
                if (BotUtility.MaxDistance(x, y, kingPos.x, kingPos.y) > range) continue;


                const targetPieceType = BotGameLogic.GetPieceType(x, y);

                if (targetPieceType !== 3) {
                    targetsEnemy.push([x, y]);
                }
            }
        }

        let targets = targetsEnemy.length > 0 ? targetsEnemy : [];

        if (targets.length === 0) {
            for (let x = 0; x < boardW; x++) {
                for (let y = 0; y < boardH; y++) {
                    if (BotGameLogic.IsNeutralPiece(x, y) && BotUtility.MaxDistance(x, y, kingPos.x, kingPos.y) <= range) {
                        targets.push([x, y]);
                    }
                }
            }
        }

        if (targets.length === 0) {
            BotUI.UpdateActionStatus("No targets available, idling...");
            await BotUtility.Sleep(100);
            return this.BotLoop();
        }

        const captureMoves = [];
        const approachMoves = [];

        const piecePriority = { 5: 1, 4: 2, 3: 3, 2: 4, 1: 5, 6: 6 };

        function isLightSquare(x, y) {
            return (x + y) % 2 === 0;
        }

        function getPathBetween(x1, y1, x2, y2) {
            const path = [];
            const dx = Math.sign(x2 - x1);
            const dy = Math.sign(y2 - y1);
            let cx = x1 + dx;
            let cy = y1 + dy;
            while (cx !== x2 || cy !== y2) {
                path.push([cx, cy]);
                if (cx !== x2) cx += dx;
                if (cy !== y2) cy += dy;
            }
            return path;
        }

        function neutralMoveApproachesEnemy(mx, my) {
            for (const [tx, ty] of targets) {
                const path = getPathBetween(mx, my, tx, ty);
                for (const [px, py] of path) {
                    if (BotGameLogic.IsNeutralPiece(px, py)) {
                        return { blocked: true, blockPos: [px, py] };
                    }
                }
                if (BotGameLogic.IsEnemy(tx, ty)) {
                    return { blocked: false };
                }
            }
            return { blocked: false };
        }

        for (let x = 0; x < boardW; x++) {
            for (let y = 0; y < boardH; y++) {
                if (!BotGameLogic.IsAlly(x, y)) continue;
                if (BotUtility.MaxDistance(x, y, kingPos.x, kingPos.y) > range) continue;

                const pieceType = BotGameLogic.GetPieceType(x, y);
                if (pieceType === 6) continue;

                const moves = BotGameLogic.GetLegalMoves(x, y);

                for (const [mx, my] of moves) {

                    if (pieceType === 3 && isLightSquare(x, y) !== isLightSquare(mx, my)) continue;  

                    if (targets.some(([tx, ty]) => {
                        if (pieceType === 3 && isLightSquare(x, y) !== isLightSquare(tx, ty)) return false;
                        return tx === mx && ty === my;
                    })) {
                        captureMoves.push({
                            pieceX: x,
                            pieceY: y,
                            moveX: mx,
                            moveY: my,
                            pieceType,
                            targetX: mx,
                            targetY: my,
                        });
                    } else {
                        const targetPiece = BotGameLogic.GetPieceType(mx, my);

                        if (targetPiece === 0) {
                            const approachCheck = neutralMoveApproachesEnemy(mx, my);
                            if (approachCheck.blocked) {
                                const bx = approachCheck.blockPos[0];
                                const by = approachCheck.blockPos[1];
                                if (moves.some(([lx, ly]) => lx === bx && ly === by) && BotGameLogic.IsNeutralPiece(bx, by)) {
                                    approachMoves.push({
                                        pieceX: x,
                                        pieceY: y,
                                        moveX: bx,
                                        moveY: by,
                                        pieceType,
                                        closestDist: BotUtility.MaxDistance(mx, my, bx, by),
                                        bestPriority: 0
                                    });
                                }
                            } else {
                                let bestPriority = 100;
                                let closestDist = Infinity;
                                for (const [tx, ty] of targets) {
                                    if (BotGameLogic.IsEnemy(tx, ty)) {
                                        const dist = BotUtility.MaxDistance(mx, my, tx, ty);
                                        const enemyType = BotGameLogic.GetPieceType(tx, ty);
                                        bestPriority = enemyPriority[enemyType] || 100;
                                        if (dist < closestDist) closestDist = dist;
                                    }
                                }

                                approachMoves.push({
                                    pieceX: x,
                                    pieceY: y,
                                    moveX: mx,
                                    moveY: my,
                                    pieceType,
                                    closestDist,
                                    bestPriority,
                                });
                            }
                        }
                    }
                }
            }
        }

        if (captureMoves.length > 0) {
            captureMoves.sort((a, b) => {
                if (piecePriority[a.pieceType] !== piecePriority[b.pieceType])
                    return piecePriority[a.pieceType] - piecePriority[b.pieceType];
                return BotUtility.MaxDistance(a.pieceX, a.pieceY, a.moveX, a.moveY) - BotUtility.MaxDistance(b.pieceX, b.pieceY, b.moveX, b.moveY);
            });
            const best = captureMoves[0];
            BotUI.UpdateActionStatus(`Ally ${BotGameLogic.PieceTypeName(best.pieceType)} at (${best.pieceX}, ${best.pieceY}) captures at (${best.moveX}, ${best.moveY})`);
            BotController.SendMove(best.pieceX, best.pieceY, best.moveX, best.moveY);
            await BotUtility.Sleep(25);
            return this.BotLoop();
        }

        const filteredApproachMoves = approachMoves.filter(move => {
            const key = `${move.pieceX},${move.pieceY}`;
            const prevPos = this.prevPositions.get(key);

            if (prevPos && prevPos[0] === move.moveX && prevPos[1] === move.moveY) {

                const alternativeExists = approachMoves.some(m =>
                    m.pieceX === move.pieceX &&
                    m.pieceY === move.pieceY &&
                    (m.moveX !== move.moveX || m.moveY !== move.moveY)
                );
                if (!alternativeExists) {
                 
                    return true;
                }
                BotUI.UpdateActionStatus(`Skipping repeated move of piece at (${move.pieceX},${move.pieceY}) to (${move.moveX},${move.moveY})`);
                return false;
            }
            return true;
        });


        if (filteredApproachMoves.length > 0) {
            filteredApproachMoves.sort((a, b) => {
                if (a.bestPriority !== b.bestPriority)
                    return a.bestPriority - b.bestPriority;
                if (a.closestDist !== b.closestDist)
                    return a.closestDist - b.closestDist;
                return piecePriority[a.pieceType] - piecePriority[b.pieceType];
            });
            const best = filteredApproachMoves[0];
            const key = `${best.pieceX},${best.pieceY}`;
            this.prevPositions.set(key, [best.moveX, best.moveY]);

            BotUI.UpdateActionStatus(`Ally ${BotGameLogic.PieceTypeName(best.pieceType)} at (${best.pieceX}, ${best.pieceY}) moves to (${best.moveX}, ${best.moveY}) to approach target`);
            BotController.SendMove(best.pieceX, best.pieceY, best.moveX, best.moveY);
            await BotUtility.Sleep(25);
            return this.BotLoop();
        }


        const alliesPositions = [];
        for (let ax = 0; ax < boardW; ax++) {
            for (let ay = 0; ay < boardH; ay++) {
                if (BotGameLogic.IsAlly(ax, ay)) {
                    alliesPositions.push({ x: ax, y: ay });
                }
            }
        }

        for (const allyPos of alliesPositions) {
            const allyKingdomSize = Math.floor(BotGameLogic.KingRealmSize);

            const intruders = [];
            let enemyKings = [];

            for (let ex = 0; ex < boardW; ex++) {
                for (let ey = 0; ey < boardH; ey++) {
                    if (BotGameLogic.IsEnemy(ex, ey)) {
                        const dist = BotUtility.MaxDistance(ex, ey, allyPos.x, allyPos.y);
                        if (dist <= allyKingdomSize) {
                            const pieceType = BotGameLogic.GetPieceType(ex, ey);
                            if (pieceType === 6) enemyKings.push({ x: ex, y: ey });
                            else intruders.push({ x: ex, y: ey });
                        }
                    }
                }
            }

            if (enemyKings.length > 0) {
                for (let px = 0; px < boardW; px++) {
                    for (let py = 0; py < boardH; py++) {
                        if (!BotGameLogic.IsAlly(px, py)) continue;
                        const pieceType = BotGameLogic.GetPieceType(px, py);
                        if (pieceType === 6) continue;
                        const moves = BotGameLogic.GetLegalMoves(px, py);
                        for (const [mx, my] of moves) {
                            if (enemyKings.some(k => k.x === mx && k.y === my)) {
                                BotUI.UpdateActionStatus(`Defending ally at (${allyPos.x},${allyPos.y}): capturing enemy King at (${mx},${my})`);
                                BotController.SendMove(px, py, mx, my);
                                await BotUtility.Sleep(25);
                                return this.BotLoop();
                            }
                        }
                    }
                }
            }

            if (intruders.length > 0) {
                for (let px = 0; px < boardW; px++) {
                    for (let py = 0; py < boardH; py++) {
                        if (!BotGameLogic.IsAlly(px, py)) continue;
                        const pieceType = BotGameLogic.GetPieceType(px, py);
                        if (pieceType === 6) continue;
                        const moves = BotGameLogic.GetLegalMoves(px, py);
                        for (const [mx, my] of moves) {
                            if (intruders.some(i => i.x === mx && i.y === my)) {
                                BotUI.UpdateActionStatus(`Defending ally at (${allyPos.x},${allyPos.y}): capturing intruder at (${mx},${my})`);
                                BotController.SendMove(px, py, mx, my);
                                await BotUtility.Sleep(25);
                                return this.BotLoop();
                            }
                        }
                    }
                }
            }
        }

        const kingIdle = !kingInDanger && kingMoves.length === 0;

        if (kingIdle) {
            const { x: kx, y: ky } = kingPos;
            const allyPiecesInRealm = [];

            for (let ax = 0; ax < boardW; ax++) {
                for (let ay = 0; ay < boardH; ay++) {
                    if (BotGameLogic.IsAlly(ax, ay) && BotGameLogic.GetPieceType(ax, ay) !== 6) {
                        if (BotGameLogic.IsInsideKingRealm(ax, ay, kx, ky)) {
                            allyPiecesInRealm.push({ x: ax, y: ay });
                        }
                    }
                }
            }

            const threateningLines = [];
            for (let ex = 0; ex < boardW; ex++) {
                for (let ey = 0; ey < boardH; ey++) {
                    if (BotGameLogic.IsEnemy(ex, ey)) {
                        const path = BotController.GetPathBetween(ex, ey, kx, ky);
 
                        if (path.length > 0 && path.every(([px, py]) => board[px][py] === 0)) {
                            threateningLines.push({ fromX: ex, fromY: ey, path });
                        }
                    }
                }
            }

            for (const line of threateningLines) {
                for (const [bx, by] of line.path) {
                    if (board[bx][by] === 0) { 

                        const candidates = allyPiecesInRealm.filter(p => {
                            const moves = BotGameLogic.GetLegalMoves(p.x, p.y);
                            return moves.some(([mx, my]) => mx === bx && my === by);
                        });

                        candidates.sort((a, b) => {
                            const defA = allyPiecesInRealm.filter(p => {
                                if (p.x === a.x && p.y === a.y) return false;
                                const moves = BotGameLogic.GetLegalMoves(p.x, p.y);
                                return moves.some(([mx, my]) => mx === bx && my === by);
                            }).length;
                            const defB = allyPiecesInRealm.filter(p => {
                                if (p.x === b.x && p.y === b.y) return false;
                                const moves = BotGameLogic.GetLegalMoves(p.x, p.y);
                                return moves.some(([mx, my]) => mx === bx && my === by);
                            }).length;
                            return defB - defA; 
                        });

                        if (candidates.length > 0) {
                            const best = candidates[0];
                            BotUI.UpdateActionStatus(`Interpose piece ${BotGameLogic.PieceTypeName(BotGameLogic.GetPieceType(best.x, best.y))} from (${best.x},${best.y}) to block line at (${bx},${by})`);
                            BotController.SendMove(best.x, best.y, bx, by);
                            await BotUtility.Sleep(25);
                            return this.BotLoop();
                        }
                    }
                }
            }
        }

        BotUI.UpdateActionStatus("No valid moves available, idling...");
        await BotUtility.Sleep(60);
        return this.BotLoop();
    },

    IsEnemyPieceDefended(x, y) {
        for (let ex = 0; ex < boardW; ex++) {
            for (let ey = 0; ey < boardH; ey++) {
                if (BotGameLogic.IsEnemy(ex, ey)) {
                    if (ex === x && ey === y) continue;
                    const moves = BotGameLogic.GetLegalMoves(ex, ey);

                    if (moves.some(([mx, my]) => mx === x && my === y)) {

                        return true;
                    }
                }
            }
        }
        return false;
    },

    SendMove(fromX, fromY, toX, toY) {
        window.moveCooldown = 0;
        send(new Uint16Array([fromX, fromY, toX, toY]));
    },

    Initialize() {
        BotUI.CreateAllySelectionMenu();
        this.BotLoop();
        setInterval(() => BotUI.CreateAllySelectionMenu(), 3000);
    }

};

BotController.Initialize();
