# Traffic Signal Kit

Welcome to the Traffic Signal Kit! This project is a learning journey into Vue.js with a focus on building practical traffic signal-related tools. These tools were built fast to serve as proof of concepts, showcasing different Vue.js features and techniques while providing a useful tool related to traffic signals.

## Purpose

The purpose of the Traffic Signal Kit is to provide simple tools for traffic engineers. By focusing on simple and small traffic signal-related tools, we aim to make the learning process engaging and relatable to practical scenarios.

## Goals

- **Learn Vue.js:** Gain a deeper understanding of Vue.js concepts, including components, directives, state management, routing, and more.
- **Explore Traffic Signal Concepts:** Apply Vue.js principles to simulate and manipulate traffic signal behaviors, timing, and controls.
- **Build Practical Tools:** Create functional traffic signal-related tools that can be used for educational purposes or as prototypes for future projects.
- **Iterative Development:** Continuously improve skills and knowledge by building a new tool each month, incorporating feedback, and experimenting with new techniques.

## Using Traffic Signal Kit

Visit the website where this website is deployed: https://trafficsignalkit.com/

## Disclaimer

Please note that the tools developed as part of the Traffic Signal Kit are intended for learning purposes and proof of concepts. They may not be fully polished or production-ready. Use them at your own discretion and be aware of any limitations or potential issues.

## Contributors

- Matt Redmond - Creator and maintainer of the Traffic Signal Kit project.

## Feedback and Contributions

Feedback, suggestions, bug reports, and contributions are welcome! If you have any ideas for new tools, improvements to existing tools, or general feedback about the project, feel free to open an issue, submit a pull request on GitHub or [fill out this feedback survey](https://forms.gle/eWchSuYdDwG6MsTx9).

## GPX Elevation Plotter

The GPX Elevation Plotter converts GPX files into an elevation profile. Paste GPX text into the tool and view a chart of elevation versus distance to analyze climbs and descents along your track.

## License

The Traffic Signal Kit project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute the code for educational or personal projects. Refer to the LICENSE file for more information.

---

Thanks for checking out Traffic Signal Kit! 🚦✨

## Block Logic Tool

A new tool is available at `/tools/block-logic` for visual, rule-based diagnostics over high-resolution traffic signal streams, now using the shared InputBox component for HR text/file entry.

### What it includes
- **Block palette + canvas + inspector** to build rule graphs with condition/operator/action blocks.
- **Rule schema v1.0** (JSON serializable/importable/exportable).
- **Execution engine** with deterministic replay order, edge handling, hold/sequence operators, timers, counters, table/plot/diagnostic outputs, and per-rule rate limiting.
- **Step + full run modes** with progress bar and cancellable worker execution for larger datasets.
- **Built-in templates:** Detector Stuck On, Green Extension Marker, and Split Failure Proxy.

### Rule schema shape

```json
{
  "version": "1.0",
  "rules": [
    {
      "id": "rule-1",
      "name": "Green Phase 2 Marker",
      "enabled": true,
      "trigger": { "type": "continuous" },
      "if": { "type": "phase", "signal": "green", "phase": 2, "target": 1, "mode": "edgeRising" },
      "actions": [{ "type": "plotPoint", "phase": 2 }]
    }
  ]
}
```

### Adding new blocks
1. Add a block factory entry in `src/utils/blockLogicSchema.js` (`createCondition` or `createAction`).
2. Add evaluation behavior in `src/utils/blockLogicEngine.js` (`evalCondition` or `runAction`).
3. Add inspector controls in `src/views/BlockLogic.vue`.
