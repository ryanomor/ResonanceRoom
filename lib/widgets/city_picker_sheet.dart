import 'dart:async';
import 'package:flutter/material.dart';
import 'package:echomatch/theme.dart';
import 'package:echomatch/services/city_catalog_service.dart';
import 'package:go_router/go_router.dart';

/// A bottom sheet that lets users pick a city from an offline list for a given
/// country. Returns only the city name (e.g., "Austin").
class CityPickerSheet extends StatefulWidget {
  final String? initialQuery;
  final String defaultCountryCode; // ISO2 (e.g., US, GB, CA)

  const CityPickerSheet({super.key, this.initialQuery, this.defaultCountryCode = 'US'});

  static Future<String?> show(BuildContext context, {String? initialQuery, String defaultCountryCode = 'US'}) => showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    backgroundColor: Theme.of(context).colorScheme.surface,
    builder: (_) => CityPickerSheet(initialQuery: initialQuery, defaultCountryCode: defaultCountryCode),
  );

  @override
  State<CityPickerSheet> createState() => _CityPickerSheetState();
}

class _CityPickerSheetState extends State<CityPickerSheet> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  final _catalog = CityCatalogService();

  List<String> _allCities = const [];
  List<String> _suggestions = const [];
  String? _selected;
  bool _loading = false;
  String? _error;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _loadCities();
    if (widget.initialQuery != null && widget.initialQuery!.trim().isNotEmpty) {
      _controller.text = widget.initialQuery!.trim();
      _scheduleFilter();
    }
  }

  Future<void> _loadCities() async {
    setState(() => _loading = true);
    try {
      final cities = await _catalog.getCitiesByCountryCode(widget.defaultCountryCode);
      if (!mounted) return;
      setState(() {
        _allCities = cities;
        _suggestions = _filter(_controller.text, cities);
      });
    } catch (e) {
      debugPrint('City catalog load failed: $e');
      if (!mounted) return;
      setState(() => _error = 'Could not load city list');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<String> _filter(String input, List<String> source) {
    final q = input.trim().toLowerCase();
    if (q.isEmpty) return source.take(30).toList(); // show some popular entries
    return source.where((c) => c.toLowerCase().contains(q)).take(50).toList();
  }

  void _scheduleFilter() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 200), () {
      setState(() => _suggestions = _filter(_controller.text, _allCities));
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _useCity() async {
    final chosen = _selected ?? _controller.text.trim();
    if (chosen.isEmpty) return;
    context.pop(chosen);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return SafeArea(
      top: false,
      child: Padding(
        padding: AppSpacing.paddingLg,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Select your city', style: context.textStyles.titleLarge?.bold),
            const SizedBox(height: 8),
            Text('Scoped to ${widget.defaultCountryCode} • type to filter', style: context.textStyles.bodyMedium?.withColor(cs.onSurfaceVariant)),
            const SizedBox(height: 16),
            Container(
              decoration: BoxDecoration(color: cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(14)),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(children: [
                Icon(Icons.location_city, color: cs.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _controller,
                    focusNode: _focusNode,
                    onChanged: (_) => _scheduleFilter(),
                    decoration: const InputDecoration(hintText: 'Start typing your city', border: InputBorder.none),
                  ),
                ),
                if (_loading)
                  Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: cs.primary)),
                  )
                else if (_controller.text.isNotEmpty)
                  IconButton(
                    tooltip: 'Clear',
                    onPressed: () {
                      _controller.clear();
                      setState(() {
                        _suggestions = _filter('', _allCities);
                        _selected = null;
                      });
                      _focusNode.requestFocus();
                    },
                    icon: Icon(Icons.close, color: cs.onSurfaceVariant),
                  )
              ]),
            ),
            const SizedBox(height: 12),
            if (_error != null) Text(_error!, style: context.textStyles.bodyMedium?.withColor(cs.error)),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: _suggestions.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text(_allCities.isEmpty ? 'Loading cities…' : 'No matches', style: context.textStyles.labelSmall?.withColor(cs.onSurfaceVariant)),
                    )
                  : SizedBox(
                      height: 300,
                      child: ListView.separated(
                        itemCount: _suggestions.length,
                        separatorBuilder: (_, __) => Divider(height: 1, color: cs.outline.withValues(alpha: 0.2)),
                        itemBuilder: (context, index) {
                          final s = _suggestions[index];
                          final selected = s == _selected;
                          return ListTile(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            leading: Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, color: selected ? cs.primary : cs.onSurfaceVariant),
                            title: Text(s, maxLines: 2, overflow: TextOverflow.ellipsis),
                            onTap: () => setState(() => _selected = s),
                          );
                        },
                      ),
                    ),
            ),
            const SizedBox(height: 12),
            if (_selected != null || _controller.text.trim().isNotEmpty)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(12)),
                child: Row(children: [
                  Icon(Icons.location_city, color: cs.primary),
                  const SizedBox(width: 8),
                  Expanded(child: Text((_selected ?? _controller.text).trim(), maxLines: 2, overflow: TextOverflow.ellipsis)),
                ]),
              ),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => context.pop(),
                  icon: Icon(Icons.close, color: cs.primary),
                  label: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(
                  onPressed: (_selected != null || _controller.text.trim().isNotEmpty) && !_loading ? _useCity : null,
                  icon: Icon(Icons.check, color: cs.onPrimary),
                  label: const Text('Use city'),
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}
