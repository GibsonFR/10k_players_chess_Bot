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

    IsKingRealmFullyCovered(kingX, kingY) {
        const realmSquares = [];
        const range = Math.floor(this.KingRealmSize);

        for (let x = Math.max(0, kingX - range); x <= Math.min(boardW - 1, kingX + range); x++) {
            for (let y = Math.max(0, kingY - range); y <= Math.min(boardH - 1, kingY + range); y++) {
                realmSquares.push([x, y]);
            }
        }

        const coveredSquaresSet = new Set();

        for (let x = 0; x < boardW; x++) {
            for (let y = 0; y < boardH; y++) {
                if (this.IsAlly(x, y)) {
                    for (const [cx, cy] of this.GetCoveredSquares(x, y)) {
                        coveredSquaresSet.add(`${cx},${cy}`);
                    }
                }
            }
        }

        return realmSquares.every(([x, y]) => coveredSquaresSet.has(`${x},${y}`));
    },

    FindCapturableEnemies() {
        const targets = [];
        const range = Math.floor(this.KingRealmSize);
        const king = this.FindKingPosition();
        if (!king) return targets;

        for (let x = 0; x < boardW; x++) {
            for (let y = 0; y < boardH; y++) {
                if (this.IsEnemy(x, y)) {
                    if (BotUtility.MaxDistance(x, y, king.x, king.y) > range) continue;

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
            maxHeight: "340px",
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
    }
};

const BotController = {
    async BotLoop() {
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
                    BotController.SendMove(kx, ky, move[0], move[1]);
                    await BotUtility.Sleep(25);
                    return this.BotLoop();
                }
            }
        }

        let bestThreat = null;
        let bestScore = -Infinity;

        for (let x = Math.max(0, kx - range); x <= Math.min(boardW - 1, kx + range); x++) {
            for (let y = Math.max(0, ky - range); y <= Math.min(boardH - 1, ky + range); y++) {
                if (BotGameLogic.IsEnemy(x, y)) {
                    const score = BotGameLogic.CalculateThreatScore(x, y, kx, ky);
                    if (score > bestScore) {
                        bestScore = score;
                        bestThreat = { tx: x, ty: y };
                    }
                }
            }
        }

        if (bestThreat) {
            const { tx, ty } = bestThreat;
            for (let x = 0; x < boardW; x++) {
                for (let y = 0; y < boardH; y++) {
                    if (BotGameLogic.IsAlly(x, y)) {
                        if (BotUtility.MaxDistance(x, y, kx, ky) > range) continue;
                        const moves = BotGameLogic.GetLegalMoves(x, y);
                        for (const [mx, my] of moves) {
                            if (mx === tx && my === ty) {
                                BotController.SendMove(x, y, mx, my);
                                await BotUtility.Sleep(25);
                                return this.BotLoop();
                            }
                        }
                    }
                }
            }
        }

        const neutralCaptureMoves = kingMoves.filter(([tx, ty]) =>
            BotGameLogic.IsNeutralPiece(tx, ty) && !BotGameLogic.IsSquareDangerous(tx, ty) && BotGameLogic.IsInsideKingRealm(tx, ty, kx, ky)
        );
        if (neutralCaptureMoves.length > 0) {
            const move = BotUtility.RandomElement(neutralCaptureMoves);
            if (move) {
                BotController.SendMove(kx, ky, move[0], move[1]);
                await BotUtility.Sleep(25);
                return this.BotLoop();
            }
        }

        // Attacks outside kingdom allowed
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
        if (capturableEnemies.length > 0) {
            capturableEnemies.sort((a, b) => BotUtility.MaxDistance(a.x, a.y, kx, ky) - BotUtility.MaxDistance(b.x, b.y, kx, ky));
            const target = capturableEnemies[0];
            for (let x = 0; x < boardW; x++) {
                for (let y = 0; y < boardH; y++) {
                    if (BotGameLogic.IsAlly(x, y) && BotGameLogic.GetPieceType(x, y) !== 6) {
                        const moves = BotGameLogic.GetLegalMoves(x, y);
                        for (const [mx, my] of moves) {
                            if (mx === target.x && my === target.y) {
                                BotController.SendMove(x, y, mx, my);
                                await BotUtility.Sleep(25);
                                return this.BotLoop();
                            }
                        }
                    }
                }
            }
        }
        // End attacks outside kingdom

        for (let x = 0; x < boardW; x++) {
            for (let y = 0; y < boardH; y++) {
                if (BotGameLogic.IsAlly(x, y) && BotGameLogic.GetPieceType(x, y) !== 6) {
                    if (BotUtility.MaxDistance(x, y, kx, ky) > range) continue;
                    const neutralMoves = BotGameLogic.GetLegalMoves(x, y).filter(([tx, ty]) =>
                        BotGameLogic.IsNeutralPiece(tx, ty) && BotGameLogic.IsInsideKingRealm(tx, ty, kx, ky)
                    );
                    if (neutralMoves.length > 0) {
                        const move = BotUtility.RandomElement(neutralMoves);
                        if (move) {
                            BotController.SendMove(x, y, move[0], move[1]);
                            await BotUtility.Sleep(25);
                            return this.BotLoop();
                        }
                    }
                }
            }
        }

        if (BotGameLogic.IsSquareDangerous(kx, ky)) {
            const safeMoves = kingMoves.filter(([tx, ty]) => !BotGameLogic.IsSquareDangerous(tx, ty));
            if (safeMoves.length > 0) {
                const move = BotUtility.RandomElement(safeMoves);
                if (move) {
                    BotController.SendMove(kx, ky, move[0], move[1]);
                    await BotUtility.Sleep(25);
                    return this.BotLoop();
                }
            }
        }

        for (let x = 0; x < boardW; x++) {
            for (let y = 0; y < boardH; y++) {
                if (BotGameLogic.IsAlly(x, y) && BotGameLogic.IsInsideKingRealm(x, y, kx, ky)) {
                    if (BotGameLogic.IsSquareDangerous(x, y)) {
                        const safeMoves = BotGameLogic.GetLegalMoves(x, y).filter(([tx, ty]) =>
                            BotGameLogic.IsInsideKingRealm(tx, ty, kx, ky) && !BotGameLogic.IsSquareDangerous(tx, ty)
                        );
                        if (safeMoves.length > 0) {
                            const move = BotUtility.RandomElement(safeMoves);
                            if (move) {
                                BotController.SendMove(x, y, move[0], move[1]);
                                await BotUtility.Sleep(25);
                                return this.BotLoop();
                            }
                        }
                    }
                }
            }
        }

        if (!BotGameLogic.IsKingRealmFullyCovered(kx, ky)) {
            for (let x = 0; x < boardW; x++) {
                for (let y = 0; y < boardH; y++) {
                    if (BotGameLogic.IsAlly(x, y) && BotGameLogic.GetPieceType(x, y) !== 6) {
                        if (BotUtility.MaxDistance(x, y, kx, ky) > range) continue;
                        const moves = BotGameLogic.GetLegalMoves(x, y).filter(([tx, ty]) => BotGameLogic.IsInsideKingRealm(tx, ty, kx, ky));
                        for (const [tx, ty] of moves) {
                            if (!BotGameLogic.IsSquareCovered(tx, ty)) {
                                BotController.SendMove(x, y, tx, ty);
                                await BotUtility.Sleep(25);
                                return this.BotLoop();
                            }
                        }
                    }
                }
            }
        }

        for (let x = 0; x < boardW; x++) {
            for (let y = 0; y < boardH; y++) {
                if (BotGameLogic.IsAlly(x, y)) {
                    if (BotUtility.MaxDistance(x, y, kx, ky) > range) continue;
                    const moves = BotGameLogic.GetLegalMoves(x, y);
                    const nonCaptureMoves = moves.filter(([tx, ty]) => {
                        const targetPiece = BotGameLogic.GetPieceType(tx, ty);
                        return targetPiece === 0 || BotGameLogic.IsNeutralPiece(tx, ty);
                    });
                    if (nonCaptureMoves.length === 0) continue;

                    const targets = [];
                    for (let ix = 0; ix < boardW; ix++) {
                        for (let iy = 0; iy < boardH; iy++) {
                            if (BotGameLogic.IsEnemy(ix, iy) || BotGameLogic.IsNeutralPiece(ix, iy)) {
                                if (BotUtility.MaxDistance(ix, iy, kx, ky) <= range) targets.push([ix, iy]);
                            }
                        }
                    }
                    if (targets.length === 0) continue;

                    const currentDistToClosest = Math.min(...targets.map(([tx, ty]) => BotUtility.MaxDistance(x, y, tx, ty)));

                    let bestMove = null;
                    let bestDist = currentDistToClosest;

                    for (const move of nonCaptureMoves) {
                        const distToClosestTarget = Math.min(...targets.map(([tx, ty]) => BotUtility.MaxDistance(move[0], move[1], tx, ty)));
                        if (distToClosestTarget < bestDist) {
                            bestDist = distToClosestTarget;
                            bestMove = move;
                        }
                    }

                    if (bestMove) {
                        BotController.SendMove(x, y, bestMove[0], bestMove[1]);
                        await BotUtility.Sleep(25);
                        return this.BotLoop();
                    }
                }
            }
        }

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
