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
        onOffContainer.style.gap = "8px";

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

        if (kingInDanger) {
            const safeMoves = kingMoves.filter(([x, y]) => !BotGameLogic.IsSquareDangerous(x, y));
            if (safeMoves.length > 0) {
                const move = BotUtility.RandomElement(safeMoves);
                if (move) {
                    BotUI.UpdateActionStatus(`King moves to safety at (${move[0]}, ${move[1]})`);
                    BotController.SendMove(kx, ky, move[0], move[1]);
                    await BotUtility.Sleep(25);
                    return this.BotLoop();
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
                    if (BotGameLogic.IsEnemy(mx, my) || BotGameLogic.IsNeutralPiece(mx, my)) {
                        BotUI.UpdateActionStatus(`King at (${kingPos.x}, ${kingPos.y}) captures at (${mx}, ${my})`);
                        BotController.SendMove(kingPos.x, kingPos.y, mx, my);
                        await BotUtility.Sleep(25);
                        return this.BotLoop();
                    }
                }
            }
        }

        if (capturableEnemies.length > 0) {
            const captureMovesGlobal = [];
            const piecePriority = { 5: 1, 4: 2, 3: 3, 2: 4, 1: 5 };
            for (let x = 0; x < boardW; x++) {
                for (let y = 0; y < boardH; y++) {
                    if (!BotGameLogic.IsAlly(x, y)) continue;
                    const pieceType = BotGameLogic.GetPieceType(x, y);
                    if (pieceType === 6) continue; 
                    const moves = BotGameLogic.GetLegalMoves(x, y);
                    for (const [mx, my] of moves) {
                        if (capturableEnemies.some(e => e.x === mx && e.y === my)) {
                            captureMovesGlobal.push({
                                pieceX: x,
                                pieceY: y,
                                moveX: mx,
                                moveY: my,
                                pieceType,
                                targetX: mx,
                                targetY: my,
                            });
                        }
                    }
                }
            }

            if (captureMovesGlobal.length > 0) {
                captureMovesGlobal.sort((a, b) => {
                    if (piecePriority[a.pieceType] !== piecePriority[b.pieceType])
                        return piecePriority[a.pieceType] - piecePriority[b.pieceType];
                    return BotUtility.MaxDistance(a.pieceX, a.pieceY, a.moveX, a.moveY) - BotUtility.MaxDistance(b.pieceX, b.pieceY, b.moveX, b.moveY);
                });
                const best = captureMovesGlobal[0];
                BotUI.UpdateActionStatus(`Ally ${BotGameLogic.PieceTypeName(best.pieceType)} at (${best.pieceX},${best.pieceY}) captures enemy outside kingdom at (${best.moveX},${best.moveY})`);
                BotController.SendMove(best.pieceX, best.pieceY, best.moveX, best.moveY);
                await BotUtility.Sleep(25);
                return this.BotLoop();
            }
        }


        for (let x = 0; x < boardW; x++) {
            for (let y = 0; y < boardH; y++) {
                if (BotGameLogic.IsAlly(x, y) && BotGameLogic.IsInsideKingRealm(x, y, kx, ky)) {
                    if (BotGameLogic.IsSquareDangerous(x, y)) {
                        const legalMoves = BotGameLogic.GetLegalMoves(x, y);
                        const safeMoves = legalMoves.filter(([tx, ty]) => {
                            if (!BotGameLogic.IsInsideKingRealm(tx, ty, kx, ky)) return false;
                            if (BotGameLogic.IsSquareDangerous(tx, ty)) return false;

 
                            const pieceType = BotGameLogic.GetPieceType(x, y);
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
                                BotUI.UpdateActionStatus(`Ally piece at (${x}, ${y}) moves to safe square (${move[0]}, ${move[1]})`);
                                BotController.SendMove(x, y, move[0], move[1]);
                                await BotUtility.Sleep(25);
                                return this.BotLoop();
                            }
                        }
                    }
                }
            }
        }


        const king = BotGameLogic.FindKingPosition();
        if (!king) return;

        const targetsEnemy = [];
        for (let x = 0; x < boardW; x++) {
            for (let y = 0; y < boardH; y++) {
                if (BotGameLogic.IsEnemy(x, y) && BotUtility.MaxDistance(x, y, king.x, king.y) <= range) {
                    targetsEnemy.push([x, y]);
                }
            }
        }

        let targets = targetsEnemy.length > 0 ? targetsEnemy : [];

        if (targets.length === 0) {
            for (let x = 0; x < boardW; x++) {
                for (let y = 0; y < boardH; y++) {
                    if (BotGameLogic.IsNeutralPiece(x, y) && BotUtility.MaxDistance(x, y, king.x, king.y) <= range) {
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

        for (let x = 0; x < boardW; x++) {
            for (let y = 0; y < boardH; y++) {
                if (!BotGameLogic.IsAlly(x, y)) continue;
                if (BotUtility.MaxDistance(x, y, king.x, king.y) > range) continue;

                const pieceType = BotGameLogic.GetPieceType(x, y);
                if (pieceType === 6) continue; 
                const moves = BotGameLogic.GetLegalMoves(x, y);

                for (const [mx, my] of moves) {
                    if (targets.some(([tx, ty]) => tx === mx && ty === my)) {
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
                            let closestDist = Infinity;
                            for (const [tx, ty] of targets) {
                                const dist = BotUtility.MaxDistance(mx, my, tx, ty);
                                if (dist < closestDist) closestDist = dist;
                            }
                            approachMoves.push({
                                pieceX: x,
                                pieceY: y,
                                moveX: mx,
                                moveY: my,
                                pieceType,
                                closestDist,
                            });
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
                return false;
            }
            return true;
        });

        if (filteredApproachMoves.length > 0) {
            filteredApproachMoves.sort((a, b) => {
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

        BotUI.UpdateActionStatus("No valid moves available, idling...");
        await BotUtility.Sleep(60);
        return this.BotLoop();
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
