# The four levels

In a textbook digital circuit, each wire is 0 or 1. On a real bus, two other states show up, and they are exactly what explains how several circuits share the same wires. The simulator uses four levels.

| Level | Drawing                       | Meaning                                              |
| ----- | ----------------------------- | ---------------------------------------------------- |
| **1** | thick line, in the wire color | high level                                           |
| **0** | thin, faded line              | low level                                            |
| **Z** | dashed                        | nobody is driving the wire: it is **floating**       |
| **X** | red, striped                  | **undefined**: it may be 0 or 1, there is no telling |

## Z: high impedance {#z}

A **tri-state buffer** has an enable input. When on, it copies its input to its output. When off, it disconnects: the output pulls the wire neither to 0 nor to 1. The wire is in **high impedance**, or **Z**.

The DB is in Z when neither the CPU nor the memory has its buffers on. That is normal between one transaction and the next.

A regular logic gate with a floating input may read anything: that is why the simulator treats an input in Z as X.

## X: undefined {#x}

A wire is **X** when:

- **two circuits drive the same wire with different values**: a **contention** (see below);
- whoever drives the wire got an undefined input;
- a cell stored a value that was not defined (a write with the DB floating, or with a WR pulse that was too short);
- the MDR latched the DB before the data was valid.

## Contention {#contencao}

If the CPU puts `0F` on the DB and, at the same time, the memory puts `00`, the 4 low bits fight: one side pulls to 1, the other to 0. In a real circuit, that wastes current and may even damage the buffers. In the simulator, these bits become X and both DB arrows show up.

Try it: turn on **MDR → DB**, **CS** and **RD** together.

## Resolving a wire {#resolucao}

When several circuits are connected to the same wire, its value follows this rule:

- nobody driving (all in Z): **Z**;
- only one driving: **its value**;
- several driving the same value: **that value**;
- several driving different values, or any X: **X**.

[//]: # 'SPDX-License-Identifier: GPL-3.0-or-later'
