import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:echomatch/services/auth_service.dart';
import 'package:echomatch/services/city_validation_service.dart';
import 'package:echomatch/theme.dart';

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

  Timer? _debounce;
  bool _isSearching = false;
  String? _error;
  List<String> _results = const [];

  @override
  void initState() {
    super.initState();
    _controller.text = widget.initialQuery ?? '';

    // Auto-focus after build so the bottom sheet animation stays smooth.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _focusNode.requestFocus();
      _search(_controller.text, immediate: true);
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 250), () => _search(value));
  }

  Future<void> _search(String query, {bool immediate = false}) async {
    final q = query.trim();
    if (q.length < 2) {
      setState(() {
        _results = const [];
        _error = null;
        _isSearching = false;
      });
      return;
    }

    if (!immediate) {
      setState(() {
        _isSearching = true;
        _error = null;
      });
    }

    try {
      final auth = mounted ? context.read<AuthService?>() : null;
      final originCity = auth?.currentUser?.city;
      final items = await CityValidationService().searchCities(q, originCity: originCity);
      if (!mounted) return;
      setState(() {
        _results = items;
        _isSearching = false;
        _error = items.isEmpty ? 'No matches found. Try adding a state/country.' : null;
      });
    } catch (e) {
      debugPrint('City search failed: $e');
      if (!mounted) return;
      setState(() {
        _isSearching = false;
        _error = 'Search failed. Please try again.';
      });
    }
  }

  Future<void> _validateTypedCity() async {
    final raw = _controller.text.trim();
    if (raw.isEmpty) return;

    setState(() {
      _isSearching = true;
      _error = null;
    });

    final normalized = await CityValidationService().validateAndNormalizeCity(raw);
    if (!mounted) return;

    setState(() => _isSearching = false);
    if (normalized == null) {
      setState(() => _error = 'Please enter a valid city (e.g., "Austin" or "Austin, TX")');
      return;
    }

    if (mounted) Navigator.of(context).pop(normalized);
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: AppSpacing.paddingLg,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Search your city', style: context.textStyles.titleLarge?.bold),
              const SizedBox(height: 8),
              Text('We\'ll validate and save a normalized location.', style: context.textStyles.bodyMedium?.withColor(Theme.of(context).colorScheme.onSurfaceVariant)),
              const SizedBox(height: 16),
              TextField(
                controller: _controller,
                focusNode: _focusNode,
                textInputAction: TextInputAction.search,
                onChanged: _onChanged,
                onSubmitted: (_) => _validateTypedCity(),
                decoration: InputDecoration(
                  labelText: 'City',
                  hintText: 'e.g., Austin, TX',
                  prefixIcon: const Icon(Icons.location_city_outlined),
                  suffixIcon: _controller.text.trim().isEmpty
                      ? null
                      : IconButton(
                          onPressed: () {
                            _controller.clear();
                            _onChanged('');
                            _focusNode.requestFocus();
                          },
                          icon: const Icon(Icons.close),
                        ),
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _isSearching ? null : () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close),
                      label: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _isSearching ? null : _validateTypedCity,
                      icon: _isSearching
                          ? SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Theme.of(context).colorScheme.onPrimary),
                            )
                          : const Icon(Icons.check),
                      label: const Text('Use city'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (_error != null) ...[
                Text(_error!, style: context.textStyles.bodyMedium?.withColor(Theme.of(context).colorScheme.error)),
                const SizedBox(height: 12),
              ],
              if (_results.isNotEmpty) ...[
                Text('Suggestions', style: context.textStyles.titleSmall?.semiBold),
                const SizedBox(height: 8),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 320),
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: _results.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final city = _results[index];
                      return Material(
                        color: Theme.of(context).colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(16),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: _isSearching ? null : () => Navigator.of(context).pop(city),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            child: Row(
                              children: [
                                Icon(Icons.place_outlined, color: Theme.of(context).colorScheme.primary),
                                const SizedBox(width: 12),
                                Expanded(child: Text(city, style: context.textStyles.bodyMedium, maxLines: 2, overflow: TextOverflow.ellipsis)),
                                const SizedBox(width: 8),
                                Icon(Icons.arrow_forward_ios, size: 16, color: Theme.of(context).colorScheme.onSurfaceVariant),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ] else ...[
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text('Type at least 2 characters to see suggestions.', style: context.textStyles.bodySmall?.withColor(Theme.of(context).colorScheme.onSurfaceVariant)),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
