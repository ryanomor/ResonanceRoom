import 'dart:async';
import 'package:flutter/material.dart';
import 'package:echomatch/theme.dart';
import 'package:echomatch/services/city_validation_service.dart';
import 'package:go_router/go_router.dart';

/// A bottom sheet that lets users search for a city and returns a normalized
/// city display name (e.g. "Austin, Texas, United States").
///
/// It queries OpenStreetMap Nominatim via [CityValidationService].
class CityPickerSheet extends StatefulWidget {
  final String? initialQuery;

  const CityPickerSheet({super.key, this.initialQuery});

  static Future<String?> show(BuildContext context, {String? initialQuery}) => showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    backgroundColor: Theme.of(context).colorScheme.surface,
    builder: (_) => CityPickerSheet(initialQuery: initialQuery),
  );

  @override
  State<CityPickerSheet> createState() => _CityPickerSheetState();
}

class _CityPickerSheetState extends State<CityPickerSheet> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  final _service = CityValidationService();

  List<String> _suggestions = const [];
  String? _selected;
  bool _loading = false;
  String? _error;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    if (widget.initialQuery != null && widget.initialQuery!.trim().isNotEmpty) {
      _controller.text = widget.initialQuery!.trim();
      _scheduleSearch();
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _scheduleSearch() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () async {
      final query = _controller.text.trim();
      if (query.length < 2) {
        setState(() {
          _suggestions = const [];
          _loading = false;
          _error = null;
          _selected = null;
        });
        return;
      }
      setState(() {
        _loading = true;
        _error = null;
        _selected = null;
      });
      try {
        final results = await _service.searchCities(query, originCity: widget.initialQuery);
        setState(() => _suggestions = results);
      } catch (e) {
        debugPrint('City search failed: $e');
        setState(() => _error = 'Could not fetch suggestions. Please try again.');
      } finally {
        if (mounted) setState(() => _loading = false);
      }
    });
  }

  Future<void> _useCity() async {
    final chosen = _selected ?? _controller.text.trim();
    if (chosen.isEmpty) return;
    setState(() => _loading = true);
    try {
      final normalized = await _service.validateAndNormalizeCity(chosen);
      if (!mounted) return;
      context.pop(normalized ?? chosen);
    } catch (e) {
      debugPrint('City validation failed: $e');
      if (!mounted) return;
      context.pop(chosen);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
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
            Text('Search for a city by name', style: context.textStyles.bodyMedium?.withColor(cs.onSurfaceVariant)),
            const SizedBox(height: 16),
            Container(
              decoration: BoxDecoration(
                color: cs.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(14),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(children: [
                Icon(Icons.search, color: cs.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _controller,
                    focusNode: _focusNode,
                    onChanged: (_) => _scheduleSearch(),
                    decoration: const InputDecoration(
                      hintText: 'Type a city (e.g., Austin, TX or London)',
                      border: InputBorder.none,
                    ),
                  ),
                ),
                if (_loading)
                  Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: cs.primary),
                    ),
                  )
                else if (_controller.text.isNotEmpty)
                  IconButton(
                    tooltip: 'Clear',
                    onPressed: () {
                      _controller.clear();
                      setState(() {
                        _suggestions = const [];
                        _selected = null;
                      });
                      _focusNode.requestFocus();
                    },
                    icon: Icon(Icons.close, color: cs.onSurfaceVariant),
                  )
              ]),
            ),
            const SizedBox(height: 12),
            if (_error != null)
              Text(_error!, style: context.textStyles.bodyMedium?.withColor(cs.error)),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: _suggestions.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text('Suggestions will appear here', style: context.textStyles.labelSmall?.withColor(cs.onSurfaceVariant)),
                    )
                  : SizedBox(
                      height: 280,
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
